# Advanced Usage Guide: Customizing the Build Pipeline with Esbuild Plugins

This guide assumes you have already completed the beginner's guide and are familiar with the basics of setting up and running a Podium podlet server. In this advanced guide, we will cover how to customize the build pipeline using Esbuild plugins.

## Step 1: Create a build.js file

Create a new file named build.js in the root of your project. This is where you will define your Esbuild plugins.

```sh
touch build.js
```

## Step 2: Define your Esbuild plugin(s)

In the build.js file, define your custom Esbuild plugin(s) by exporting a default function that returns an array of plugins. The app configuration object will be provided to this function.

Example: build.js
```javascript
// Export a default function that returns an array of Esbuild plugins
// The app configuration is provided to the function
export default ({ config }) => [
  {
    // Plugin name, snake case
    name: "esbuild-my-plugin",
    // Setup function gets passed a build object which has various lifecycle hooks
    setup(build) {
      // Must provide a filter regex to determine which files in the build will be handled
      build.onLoad({ filter: /(content|fallback)\.(ts|js)$/ }, async (args) => {
        // Custom plugin logic goes here
      });
    },
  },
];
```
## Step 3: Implement your custom plugin logic

Inside the setup() function of your plugin, you can implement your custom plugin logic. The build object passed to the setup() function provides various lifecycle hooks, such as onLoad, onTransform, and onEnd.

For more information on available hooks and how to use them, refer to the [Esbuild plugins documentation](https://esbuild.github.io/plugins/).

## Step 4: Test your custom plugin

After defining your custom Esbuild plugin(s) in the build.js file, run your application to test the plugin(s). If the plugin is implemented correctly, you should see the effect of the plugin(s) in your build process.

That's it! You have successfully customized the build pipeline of your Podium podlet application using Esbuild plugins. For more advanced usage and examples, check out the [Esbuild documentation](https://esbuild.github.io/).