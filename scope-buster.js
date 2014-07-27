(function (angular) {
    'use strict';

    angular.module('ScopeBuster', ['ngRoute']).
        factory('scopeBuster', [
            '$timeout',
            '$location',
        function ($timeout, $location) {
            var scopes = {},        // scope.$id => scope
                mappings = {},      // scope.$id => variable.name => [scope.var1, scope.var2]
                variables = {},     // variable.name => value
                timers = {},        // timers for rate limits and de-bounce
                temp ={},           // storage for rate limited values (last known value)
                api = {},

                updateListeners = function (newVal, options) {
                    // update the mappings
                    angular.forEach(mappings[options.mapping], function (vars, scope_id) {
                        var index,
                            name;

                        for (index = 0; index < vars.length; index += 1) {
                            name = vars[index];

                            // TODO:: may need to apply here?
                            scopes[scope_id][name] = newVal;
                        }
                    });
                };


            // Options == :
            // variable: 'deep.link'
            // mapping: 'namespace.varname'
            // persist: false
            // routeParam: false
            // debounce: false (wait %time% for changes to stop)
            //    or
            // ratelimit: false (wait %time% and send current value)
            api.pub = function (scope, variable, options) {
                options = options || {};

                var mapping = options.mapping || variable,
                    search = $location.search()[options.routeParam];

                // Check if param set and set the scope variable if so
                if (options.routeParam && search !== undefined && scope[variable] === undefined) {
                    variables[mapping] = scope[variable] = search;
                    updateListeners(search, options);
                }

                scope.$watch(variable, function (newVal) {
                    if (variables[mapping] === newVal) {
                        // may have been set by route param
                        return;
                    }

                    // set the variable
                    variables[mapping] = newVal;

                    // updates listening scopes
                    if (mappings[mapping] !== undefined) {
                        if (options.debounce) {
                            if (timers[mapping] !== undefined) {
                                $timeout.cancel(timers[mapping]);
                            }
                            timers[mapping] = $timeout(function () {
                                delete timers[mapping];
                                updateListeners(newVal, options);
                            }, options.debounce);
                        } else if (options.ratelimit) {
                            temp[mapping] = newVal;

                            if (timers[mapping] === undefined) {
                                timers[mapping] = $timeout(function () {
                                    delete timers[mapping];
                                    updateListeners(temp[mapping], options);
                                }, options.ratelimit);
                            }
                        } else {
                            updateListeners(newVal, options);
                        }
                    }

                    // Update the location
                    if (options.routeParam) {
                        if (newVal === '') {
                            $location.search(options.routeParam, undefined);
                        } else {
                            $location.search(options.routeParam, newVal);
                        }
                    }
                });

                scope.$on('$destroy', function () {
                    // Check if persistent and delete otherwise
                    if (!options.persist) {
                        delete variables[mapping];
                        if (options.routeParam) {
                            $location.search(options.routeParam, undefined);
                        }
                    }

                    if (options.ratelimit || options.debounce) {
                        if (timers[mapping] !== undefined) {
                            $timeout.cancel(timers[mapping]);
                            delete timers[mapping];
                        }
                    }
                });

                // Watch the routeParam for changes
                if (options.routeParam) {
                    scope.$on('$routeUpdate', function () {
                        var current = variables[mapping],
                            newVal = $location.search()[options.routeParam];
                        
                        // Edge case as we don't display route params that are empty
                        if (current === '' && newVal === undefined) {
                            return;
                        }
                        
                        // NOTE:: Only double equals as the variable might be a number
                        //   and route will be a string (of course 0 == '', fuck it)
                        if (newVal != current) {
                            if (current !== undefined) {
                                if (typeof(current) === 'number') {
                                    if (current.indexOf('.') < 0) {
                                        newVal = parseInt(newVal);
                                    } else {
                                        newVal = parseFloat(newVal);
                                    }
                                }
                            }

                            scope[variable] = newVal;
                        }
                    });
                }
            };

            api.sub = function (scope, destination, source) {
                var scope_id = scope.$id,
                    scope_mapping;

                source = source || destination;

                // Add a watch from a remote scope
                scopes[scope_id] = scope;
                mappings[source] = mappings[source] || {};
                scope_mapping = mappings[source];

                if (scope_mapping[scope_id] === undefined) {
                    scope_mapping[scope_id] = [];

                    scope.$on('$destroy', function () {
                        delete scopes[scope_id];
                        delete scope_mapping[scope_id];
                    });
                }
                
                scope_mapping[scope_id].push(destination);

                if (variables[source] !== undefined) {
                    scope[destination] = variables[source];
                }
            };

            return api;
        }]);

}(this.angular));
