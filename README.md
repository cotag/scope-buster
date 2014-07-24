# Scope Buster

Scope buster is used to connect data from various scopes without leakage.
For instance, linking a search box in the header to a controller for the view whilst also maintaining a search parameter in the URL and providing either rate limiting or debouncing at the same time.

1. Open your bower.json
2. Add `"scope-buster": "~1.0.0"` to your dependency list
3. Run `bower install`
4. In your application you can now add:
   * `<script src="components/scope-buster/scope-buster.js"></script>`
   * Add `scopeBuster` to your module list in your app


## AngularJS Usage

```js

scopeBuster.pub(otherScope, 'variable.name', {
    // Optional options
    mapping: 'name.of.scopeBuster.variable',  // defaults to variable.name provided
    persist: false,     // Hold value after scope has been destroyed
    routeParam: 'query', // name of the routeParam that should be kept in sync

    // Both these default to false
    // debounce: 200,   // ms without change before we apply the value after an update
    // ratelimit: 200 // ms before we apply the latest value
});



// Then in another scope you can:


scopeBuster.sub(scope, 'local', 'name.of.scopeBuster.variable');

// Then you can watch for changes or bind to the variable
// i.e.

scope.$watch('local', function (newVar) {
    // newVar === otherScope.variable.name
});

```

It is up to you to ensure variables are namespaced correctly in scopeBuster so that there are no clashes.
