(function (angular) {
    'use strict';

    angular.module('ScopeBuster', ['ngRoute']).
        factory('scopeBuster', [
            '$timeout',
            '$location',
            '$routeParams',
        function ($timeout, $location, $routeParams) {
            var scopes = {},        // scope.$id => scope
                mappings = {},      // scope.$id => variable.name => [scope.var1, scope.var2]
                variables = {},     // variable.name => value
                timers = {},        // timers for rate limits and de-bounce
                temp ={},           // storage for rate limited values (last known value)
                api = {},

                updateListeners = function (newVal, options) {
                    // Update the location
                    if (options.routeParam) {
                        if (newVal === '') {
                            $location.search(options.routeParam, undefined);
                        } else {
                            $location.search(options.routeParam, newVal);
                        }
                    }

                    // update the mappings
                    angular.forEach(mappings[options.mapping], function (scope_id, vars) {
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

                var mapping = options.mapping || variable;

                scope.$watch(variable, function (newVal) {
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
                    // Attach to scope so we can watch for changes
                    scope.$coRouteParams = $routeParams;

                    scope.$watch('$coRouteParams.' + options.routeParam, function (newVal) {
                        var current = variables[mapping];
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
