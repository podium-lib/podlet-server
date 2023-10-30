# Podlet Server [beta]

This package can be used to bootstrap an opinionated Podium podlet server that provides:

- Shadow DOM isolation via Lit custom elements
- SSR + hydrate, CSR or SSR only
- Built in localisation support
- Build in route parameter validation
- Metrics collection
- Automatically generated content, fallback and manifest routes
- A Dev mode with watch/live reload
- A pluggable build pipeline based on Esbuild
- Easy extensible configuration system based on the convict module.

## Getting started

Install the following 3 packages:

```
npm install @podium/podlet-server @podium/element lit
```

Create a file called `content.js` in your project root that provides a Lit custom element as the default export.
While any Lit Element component will work the provided base class provides enhanced functionality which will be used
later in this guide.

```js
import { html, css } from "lit";
import { PodiumElement } from "@podium/element";

export default class Content extends PodiumElement {
  static styles = css`
    .demo {
      color: hotpink;
    }
  `;

  render() {
    return html`<section class="demo">This is a demo</section>`;
  }
}
```

Start the server in dev mode

```
npx @podium/podlet-server dev
```

And visit `http://localhost:8080` in your browser.

You should see the text "This is a demo" in hot pink. This was both rendered server side and also hydrated client side out of the box.

## Guides

See the usage guides for walkthrough of various features of the server

- [Getting Started](./GUIDE_GETTING_STARTED.md)
- [Configuration](./GUIDE_CONFIG.md)
- [Customising the server](./GUIDE_SERVER.md)
- [Validating routes](./GUIDE_VALIDATION.md)
- [Using localization](./GUIDE_LOCALIZATION.md)
- [Additional scripts and lazy loading](./GUIDE_SCRIPTS_AND_LAZY_LOADING.md)
- [Customising the build pipeline](./GUIDE_BUILD.md)

## Folder Structure and File Naming

A podlet server app requires that certain folders and file names conventions are observed in order to work properly.
In the most basic sense, the app might just consist of a package.json file and a content.js file.

```
/
  content.js
  package.json
```

Alternatively, an app might features such as config, localisation, additional server files, additional client side files and so on. An app that uses many of these things will look more like this:

```
/
  content.js
  fallback.js
  server.js
  build.js
  scripts.js
  lazy.js
  document.js
  package.json
  /config
    schema.js
    common.json
    hosts/
      localhost/
        config.local.json
  /schemas
    /content.js
    /fallback.js
  /locale
    en.json
    no.json
  /server
    additional-file1.js
    additional-file2.js
  /src
    additional-file1.js
    additional-file2.js
```

### Folders and files, an overview

#### **content.js [required]**

This is the entrypoint for your apps content route. You may import dependencies from node_modules and additional source files from /src
This file must export a default export which is a LitElement class.

#### **fallback.js [optional]**

This is the entrypoint for your apps fallback route. You may import dependencies from node_modules and additional source files from /src
This file must export a default export which is a LitElement class.

#### **scripts.js [optional]**

This file can be used to define additional client side scripts that will be loaded. This is most useful for ssr-only app modes where you may need to add
additional scripting to the SSR'd content.

#### **lazy.js [optional]**

This file can be used to lazy load additional client side scripts after the window load event has fired. This is useful for adding tracking scripts or other
scripts that aren't needed on initial page load. Using this can help to get your initial bundle weight down and get pixels on the screen faster.

#### **document.js [optional]**

This file can be used to add a Podium document template

```javascript
// document.js
export default (incoming, fragment, head) => `
<!doctype html>
<html lang="${incoming.context.locale}">
    <head>
        <meta charset="${incoming.view.encoding}">
        <title>${incoming.view.title}</title>
        ${head}
    </head>
    <body>
        ${fragment}
    </body>
</html>`;
```

See [the Podium docs](https://podium-lib.io/docs/api/document) for more information.

#### **server.js [optional]**

This is your way to hook into the app server by defining a Fastify plugin.
You must export the a function that is a Fastify plugin.

This function must be async

```js
export default async function server(fastify, { config, podlet }) {
  fastify.setContentState(() => ({
    key: "value",
  }));
}
```

OR call a done callback

```js
export default function server(fastify, { config, podlet }, done) {
  fastify.setContentState(() => ({
    key: "value",
  }));
  done();
}
```

This file may import packages from node_modules or files from the /server folder

#### **build.js [optional]**

This file can be used to hook into the Esbuild build process. It must export a function as a default function and return an array of Esbuild plugins

```js
import plugin from "some-esbuild-plugin";
export default () => [plugin()];
```

#### **config [optional]**

This is the folder for configuring the app, see the config section below.

#### **schemas [optional]**

This folder can be used to define a `content.js` or `fallback.js` file that can be used to define validation schemas for your content and fallback routes.
See the section below on validation.

#### **locale [optional]**

This is the folder for adding translation json files, see the section on localisation below.

#### **server [optional]**

This folder is for any additional files you might need to import from `server.js`

#### **src [optional]**

This folder is for any additional files you might need to import from `content.js` or `fallback.js`

## The App Name

Podlet's must have a name value. This module restricts names to a-z and the - character as in `my-podlet`.
This name value is used for a number of things and by default is read from the package.json name field.
If you don't create a valid name, the app with throw an error. You can configure this name value either by changing the package.json name field
or by using config. (see the config section below).
By default, the podlet's routes are mounted under a pathname specified by app name.

Example

```
# if name is my-podlet
# The manifest route will be
http://localhost:8080/my-podlet/manifest.json
# The content route will be
http://localhost:8080/my-podlet
# and the fallback route will be
http://localhost:8080/my-podlet/fallback
```

## Routes

Podium podlet's typically require that you define 3 main routes, a content, a fallback and a manifest route.
Additional API routes can also be defined as needed.

### Content

The content route can be defined by adding a file called `content.js` and providing a LitElement class as default export. (See the example above).
When you start the app, this file will be detected and setup for SSR and hydration at the path `http://localhost:8080/<podlet-name-value>`.

### Fallback

The fallback route can be defined by adding a file called `fallback.js` and providing a LitElement class as default export in the same way as for content.js.
When you start the app, this file will be detected and setup for SSR and hydration at the path `http://localhost:8080/<podlet-name-value>/fallback`.

### Manifest

A manifest route is automatically setup at `http://localhost:8080/<podlet-name-value>/manifest.json`

### Additional API Routes

See the section below on server customisation for how you can hook in to define additional routes.

## App Modes

The podlet server can be configured to run under one of several modes to cater for different use cases.
These modes are `hydrate`, `ssr-only` and `csr-only`.

This can be configured using the config setting `app.mode`. (see the config section below)

### Server Side Rendered (hydrate)

Use this mode if you're writing podlets that will be included in layouts you don't control, or that include client side rendering/hydration.

When `app.mode` is set to `hydrate`, the content and fallback routes will be server rendered and then client side hydrated afterward.
No additional setup is required but see guidelines for writing SSR custom elements on the Lit docs site. [https://lit.dev/docs/ssr/authoring/](https://lit.dev/docs/ssr/authoring/).

### Server Side Rendered (ssr-only)

When `app.mode` is set to `ssr-only`, the content and fallback routes will be server rendered but will not be hydrated on the client side afterward.
This is good if you want to use components from a shared library or design system but don't actually need interactivity on the client side.

If you control the layout(s) where the podlet will be rendered, it is recommended you use this option, as it will prevent sending KBs of JavaScript to the users browser.
The downside compared to `hydrate` is, if another part of a layout does client-side render a shared component (such as an icon), Lit won't be able to properly replace the server-side rendered markup, and you end up with duplicates.

No additional setup is required but see guidelines for writing SSR custom elements on the Lit docs site. [https://lit.dev/docs/ssr/authoring/](https://lit.dev/docs/ssr/authoring/).

### Client Side Rendered (csr-only)

When `app.mode` is set to `csr-only`, the content and fallback routes will not be rendered on the server but will be "upgraded" on the client side.
This module will render out a tag for the element and the code in content.js and fallback.js will be used client side to define the tag.
This is a good option if your podlet provides functionality that is not initially seen when a page is loaded such as a modal dialog etc.

## Server Customisation

By default, the app will run without any server configuration but in many cases you will want access to the server in order to plug in functionality,
define api routes or serialize data from the backend and provide it to the client. This can be done by creating a Fastify plugin in a `server.js` file.

The signature for the plugin is as follows

```js
// server.js
export default async function server(fastify, { config, podlet }) {}
```

Notice that an instance of the fastify app, a config object and an instance of the Podium podlet class are all passed into the plugin.
See [the Fastify plugin docs](https://www.fastify.io/docs/latest/Reference/Plugins/) for more information on defining Fastify plugins, below for more information on the config object and [the Podium podlet docs](https://podium-lib.io/docs/podlet/getting_started) for more information on podlets.

### Sharing Values Between Server and Client

Within the server plugin, you have access to a couple functions that can be used to share data from the server with the client.

These are:

- fastify.setContentState(obj)
- fastify.setFallbackState(obj)

Any object passed to these functions will be serialized on the server side and deserialized for use on the client side.
The same data will be used server side for SSR.

```js
// server.js
export default async function server(fastify, { config, podlet }) {
  fastify.setContentState(() => ({
    key: "value",
  }));
}
```

```js
// content.js
export default class Content extends PodiumElement {
  render() {
    return html`<section>${this.initialState.key}</section>`;
  }
}
```

As the names imply, `setContentState` only applies to the content route and `setFallbackState` only applies to the fallback route.

### Defining API routes

You can define additional API routes for use in the client by using the fastify object

```js
// server.js
export default async function server(fastify, { config, podlet }) {
  // http://localhost:8080/<my-podlet-name>/api
  const pathname = join(config.get("app.name"), "api");
  fastify.get(pathname, async (req, reply) => {
    return { key: "value" };
  });
}
```

For the client to be able to locate the api route when mounted in any layout you can use Podium context values to build paths and send them to the client
using `.setContentState`.

```js
// server.js
export default async function server(fastify, { config, podlet }) {
  fastify.setContentState((request, context) => ({
    api: new URL(`${context.publicPathname}/api`, context.mountOrigin).href,
  }));
}
```

Then on the client side, you can use `initialState` to get the api url and start using it to make requests

```js
// content.js
export default class Content extends PodiumElement {
    static properties = {
        data: { state: true },
    }
    connectedCallback() {
        super.connectedCallback();
        const result = await fetch(this.initialState.api);
        this.data = await result.json();
    }
}
```

Depending on your setup, you may need to use Podium proxying to give client side code access to podlet api routes.
This can be done in server.js using the podlet object like so:

```js
// server.js
export default async function server(fastify, { config, podlet }) {
  // http://localhost:8080/<my-podlet-name>/api
  const target = join(config.get("app.name"), "api");
  fastify.get(podlet.proxy({ target, name: "api" }), async (req, reply) => {
    return { key: "value" };
  });
}
```

See the [Podium proxy docs](https://podium-lib.io/docs/podlet/proxying) for more information

### Other uses for server.js

There are a plethora of Fastify plugins which can be plugged into the server via server.js

```js
// server.js
export default async function server(fastify, { config, podlet }) {
  fastify.register(pluginName, options);
}
```

## Logger

A [pino](https://github.com/pinojs/pino) logger is available in the server as follows

```js
export default async function server(app, { logger }) {
  logger.info("hello from the server");
}
```

## Configuration

The app comes with a built in configuration system based on [Convict](https://www.npmjs.com/package/convict).
Sensible defaults are provided but almost everything can be overridden or extended.

Configuration lives in a folder which must be named `config`. In this folder you can:

- Globally override configuration values in a `config/common.json` file.
- Override configuration for specific hosts and environments in folders named using the pattern `config/hosts/<host name>/config.<env>.json`.
- Add additional config values for use throughout your app via a `schema` defined in `config/schema.js`

See the subsections below for additional information.

### Common Settings

When you need to override specific configuration settings regardless of context (whether that be host or environment),
you can create a file called `config/common.json` and overide values by key. (See the list of config keys below for more)

For example, if you wanted to override the app name you would do that like so:

```json5
// config/common.json
{
  app: {
    name: "my-podlet",
  },
}
```

### Host/Environment Specific Settings

2 environment variables can be set which will be used to determine the host and the environment. These are HOST (defaults to "localhost") and ENV (defaults to "local")
You are encouraged to set these values differently for each relevant environment that your app will run in. For example, if you have a single host `www.finn.no`, a staging environment
and a production environment, then you would set HOST=`www.finn.no` or `localhost` and ENV to either ENV=`local` or `staging` or `production` or perhaps even `test` if needed.
You will then be able to override config for any combination of these hosts and environments by creating folders with json config files in them.

For example:

```
/config
    /hosts
        /localhost
            /config.local.json
            /config.staging.json
            /config.test.json
            /config.production.json
        /www.finn.no
            /config.local.json
            /config.staging.json
            /config.test.json
            /config.production.json
```

Only create those files you need, you might not need any and in any case it probably doesn't make much sense to create some, /config/hosts/localhost/config.production.json for example.

### Schemas

Extending the built in configuration values is possible via a schema file which, if defined, should be defined at `config/schema.js`
This file should follow the guidelines set out in [convict](https://www.npmjs.com/package/convict)

Example

```js
export default {
  db: {
    host: {
      doc: "Database host name/IP",
      format: "*",
      default: "server1.dev.test",
    },
    name: {
      doc: "Database name",
      format: String,
      default: "users",
    },
  },
};
```

Default values can be set and specific values can be assigned to environment variables if needed.
Any values defined in this file, can be overridden for specific hosts and environments as described above in the section of hosts and environments.

### List of built in config keys

#### App Config

| Key                            | Default                                         | ENV         | Possible Values                                    |
| ------------------------------ | ----------------------------------------------- | ----------- | -------------------------------------------------- |
| `app.name`                     | package.json name value                         | APP_NAME    |                                                    |
| `app.env`                      | local                                           | ENV         |                                                    |
| `app.host`                     | localhost                                       | HOST        |                                                    |
| `app.port`                     | 8080                                            | PORT        |                                                    |
| `app.logLevel`                 | INFO                                            | LOG_LEVEL   | "TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL" |
| `app.locale`                   | en                                              | LOCALE      |                                                    |
| `app.locales`                  | []                                              | LOCALES     |                                                    |
| `app.development`              | true when NODE_ENV=development, false otherwise | DEVELOPMENT | true/false                                         |
| `app.component`                | true                                            |             |                                                    |
| `app.mode`                     | hydrate                                         |             | hydrate, ssr-only, csr-only                        |
| `app.grace`                    | 0                                               |             |                                                    |
| `app.processExceptionHandlers` | true                                            |             | true/false                                         |
| `app.compression`              | true                                            |             | true/false                                         |

#### Podlet Config

| Key               | Default          | ENV     | Possible Values |
| ----------------- | ---------------- | ------- | --------------- |
| `podlet.pathname` | "/"              |         |                 |
| `podlet.version`  | ${Date.now()}    | VERSION |                 |
| `podlet.manifest` | "/manifest.json" |         |                 |
| `podlet.content`  | "/"              |         |                 |
| `podlet.fallback` | "/fallback"      |         |                 |

### Metrics Config

| Key                               | Default | ENV | Possible Values |
| --------------------------------- | ------- | --- | --------------- |
| `metrics.timing.timeAllRoutes`    | false   |     | true/false      |
| `metrics.timing.groupStatusCodes` | true    |     | true/false      |
| `metrics.timing.enabled`          | true    |     | true/false      |

### Assets Config

| Key                  | Default     | ENV | Possible Values |
| -------------------- | ----------- | --- | --------------- |
| `assets.base`        | "/static"   |     |                 |
| `assets.development` | false       |     | true/false      |
| `assets.scripts`     | auto detect |     | true/false      |
| `assets.lazy`        | auto detect |     | true/false      |

## Customising The Build Pipeline [Advanced]

Under the hood app builds and dev are provided by Esbuild.
It's possible to hook into this build by creating a `build.js` file and defining an Esbuild plugin or plugins.

```js
// Exporting this function will get picked up and plugged into the build
// Must export a default export of a function and return an array of 1 or more Esbuild plugins
// app config is provided to the function
export default ({ config }) => [
  {
    // plugin name, snake case
    name: "esbuild-my-plugin",
    // setup function gets passed a build object which has various lifecycle hooks
    setup(build) {
      // must provide a filter regex to determine which files in the build will be handled
      build.onLoad({ filter: /(content|fallback)\.(ts|js)$/ }, async (args) => {});
    },
  },
];
```

See [the Esbuild docs](https://esbuild.github.io/plugins/) for more information.

## Metrics

Under the hood, various metrics are gathered and provided for consumption in server.js if desired.
[@metrics](https://www.npmjs.com/package/@metrics/client) is used to pipe metrics streams together.

```js
// server.js
export default async function server(fastify, { config, podlet }) {
  // fastify.metrics is a stream that can be piped into a consumer
}
```

## Typescript

Typescript is supported out of the box, just create content.ts and fallback.ts instead of their js counterparts.
Esbuild is used to provide this support and as such types are not checked, just stripped out.
Run tsc on the side to check types as part of your build.

## Route Validation

It is possible to add validation to your content and fallback routes via Fastify's route validation support.
Create a file called `schemas/content.js` or `schemas/fallback.js` to add validation and export an object of validation rules.

Validation rules use [JSON Schema](https://json-schema.org) syntax

Example

```js
// schemas/content.js
export default {
  querystring: {
    type: "object",
    properties: {
      id: { type: "integer" },
    },
    required: ["id"],
  },
};
```

Note: To encourage best possible security, schemas are required in order to use headers, query parameters and route params.
If you don't use any of these in your podlet, you don't need to define a schema file.

In general, validation behaviour is as follows:

If no schema file is defined for a given route:

- All route params and query params are silently stripped and will not be accessible in your app.
- All headers except the Podium context headers and the Accept-Encoding header are silently stripped and will not be accessible in your app.

If a schema is defined for a given query param, route param or header:

- The header will be available in your app and any errors in usage will result in your routes responding with a 400 bad request.

See the [Fastify docs](https://www.fastify.io/docs/latest/Reference/Validation-and-Serialization/) for more examples and information regarding writing validation schemas.

## Error handling

Error handling has been added to enable developers to control application errors.
If you throw an ordinary error from app.setContentState or app.setFallbackState this will result in the route serving a http 500 Internal Server error.
You can control which http errors the server should respond with by throwing a [http-errors](https://www.npmjs.com/package/http-errors) error.
In addition, an errors object with http-errors convenience methods has been added to make throwing different kinds of http errors more streamlined
See [http-errors](https://www.npmjs.com/package/http-errors) for available methods.

Example

```js
export default async function server(app, { errors }) {
  app.setContentState(async () => {
    throw errors.ImATeapot();
  });
}
```

response from the apps content route will be:

```json
{
  "statusCode": 418,
  "message": "I'm a Teapot"
}
```
