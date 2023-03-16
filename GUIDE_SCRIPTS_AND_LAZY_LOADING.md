# Advanced Guide: Using scripts.js and lazy.js for additional client-side functionality

## scripts.js for additional JavaScript functionality

Create a scripts.js file in the root of your project directory. This file will be loaded after any scripts needed to hydrate or define the main podlet.
```js
// scripts.js
console.log("This script will be loaded after the main podlet scripts.");
```
To use scripts.js effectively in your app, ensure that your app is running in server-side only mode (ssrOnly). You can do this by updating your config file or setting the SSR_ONLY environment variable.

```json
// config/common.json
{
  "ssrOnly": true
}
```

Now, when you run your app and load it in the browser, the `scripts.js` file will be loaded after the main podlet scripts. This allows you to provide additional client-side functionality for your app when it's running in server-side only mode.

Keep in mind that since the app is running in server-side only mode, it won't be fully interactive. In that case, the scripts.js file should be used for providing any supplementary client-side functionality that can enhance your app's user experience.

## lazy.js for lazy-loaded scripts

Create a `lazy.js` file in the root of your project directory. This file will be loaded after the window load event, allowing non-essential scripts to be deferred.

```js
// lazy.js
console.log("This script is lazy-loaded after the window load event.");
```

There is no need to modify any configuration for using lazy.js. The app will automatically handle the lazy-loading of this file after the window load event.

Now, when you run your app and load it in the browser, the `lazy.js` file will be loaded after the window load event. This allows you to defer non-essential scripts, such as tracking scripts, to improve the initial page load performance.

Remember that the primary purpose of `lazy.js` is to include non-essential scripts that can be deferred for better performance. Make sure to only place code in `lazy.js` that doesn't impact the initial user experience or rendering of the page.