Advanced Guide: Writing Extensions for Podium Podlet-Server
===========================================================

This guide assumes you have already completed the beginner's guide and are familiar with the basics of setting up and
running a Podium podlet server. In this advanced guide, we will cover how to create, publish, and use extensions for
Podium podlet-server applications.

Step 1: Create an extension project
-----------------------------------

Create a new directory for your extension project and initialize a new Node.js project with a `package.json` file.

sh

```sh
mkdir my-extension
cd my-extension
npm init -y
```

Step 2: Configure the package.json file
---------------------------------------

Update the `package.json` file to include the following properties:

json

```json
{
  "name": "my-extension",
  "version": "1.0.0",
  "type": "module",
  "main": "./index.js"
}
```

Step 3: Implement the extension
-------------------------------

Create an `index.js` file in the project root and implement one or more of the optional
hooks: `server`, `build`, `document`, and `config`.

sh

```sh
touch index.js
```

Example `index.js`:

javascript

```javascript
// index.js

// Server hook (Fastify plugin)
export const server = async (app, opts) => {
  app.get('/my-extension', async (request, reply) => {
    reply.send({ message: 'Hello from my-extension!' });
  });
};

// Build hook (esbuild plugins)
export const build = async ({ cwd, development }) => [{
  // Add one or more esbuild plugins
}];

// Document hook (Podium document template)
export const document = (incoming, template) => {
  // Customize the document template here
  return template;
};

// Config hook (Convict schema)
export const config = ({ cwd, development }) => {
  // Add Convict schema here
};
```

Step 4: Publish the extension to npm
------------------------------------

Before publishing your extension to npm, make sure you have an npm account and are logged in. If you don't have an
account, create one at [npmjs.com](https://www.npmjs.com/).

sh

```sh
npm login
npm publish
```

Step 5: Use the extension in a Podium podlet-server application
---------------------------------------------------------------

In your Podium podlet-server application, install the extension from npm:

sh

```sh
npm install my-extension
```

Next, enable the extension by adding the following to your Podium podlet-server application's `package.json` file:

json

```json
{
  "podium": {
    "extensions": {
      "podlet-server": [
        "my-extension"
      ]
    }
  }
}
```

That's it! You have now successfully created, published, and used an extension for Podium podlet-server applications.
This extension can enhance your Podium podlet-server applications with additional functionality, such as custom Fastify
routes, esbuild plugins, Podium document templates, or Convict schema configuration.

For more information on each of the hooks, refer to the following resources:

* Fastify
  plugins: [https://www.fastify.io/docs/latest/Guides/Plugins-Guide/](https://www.fastify.io/docs/latest/Guides/Plugins-Guide/)
* esbuild plugins: [https://esbuild.github.io/plugins/](https://esbuild.github.io/plugins/)
* Podium document templates: [https://podium-lib.io/docs/api/document](https://podium-lib.io/docs/api/document)
* Convict
  schema: \[[https://github.com/mozilla/node-convict/tree/master/packages/convict\](](https://github.com/mozilla/node-convict/tree/master/packages/convict%5D()[https://github.com/mozilla/node-convict](https://github.com/mozilla/node-convict)