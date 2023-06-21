## EXTENSIONS

Extensions are just NPM packages that export a file with specific properties are defined below.
These properties provide hooks into the server

### Setting the extension name

Used for namespacing purposes. a-z and - characters only.

```js
export const name = "";
```

### Extending the build pipeline

Esbuild plugins and entry points for files to be bundled during client side production build. ie. when the `podlet build` command is run.

```js
export const build = {
  plugins: [],
  entryPoints: ["./content"],
};
```

### Extending and overwriting configuration

Additional schema and convict formats can be provided to overwrite and extend the Convict config schema

```js
export const config = {
  schema: {},
  formats: [],
};
```

### Extending the server

A Fastify plugin can be supplied to extend the Fastify server. This plugin conforms to the Fastify plugin interface and is, in addition, passed the server context object as
a second argument.

```js
export const async function server(app, context) {
    // additional routes etc here
}
```

### Extending file loading and watching

Additional files for the server to watch and load can be specified, cwd will automatically be prepended to relative paths.
Files specified for watching will be watched when using the development server class and watch events will emitted on the context object

```js
export const files = {
  watch: { client: [], server: [] },
  load: [],
};
```

```js
export const files = {
  watch: { client: ["./content"], server: ["./content"] },
}

export const async function server(app, context) {
  context.fileWatcher.on("change:server", (file) => {
      // do something, perhaps flag the file as dirty so that next load will refresh
  })
  context.fileWatcher.on("change:client", (file) => {
      // do something, perhaps forward a signal to the browser to refresh the page
  })
}
```

Files loaded using the load property will be imported and available via the context as well. TypeScript will be handled.

```js
export const files = {
  load: ["./content"],
}

export const async function server(app, context) {
  if (context.files.has("./content")) {
      const content = context.files.get("./content");
  }
}
```

### Additional extension meta data

Any extra meta data that can be shared between extensions and app files can be included using the meta object export

```js
export const meta = {};
```

This could be anything and will be added to the context object such that it is available in other downstream extensions and in the app code itself

```js
export const meta = {
    foo: "bar"
}

// server function in an extension, or in the apps ./server.js file etc
export const async function server(app, context) {
    const { foo } = context.meta;
}
```

## Example extensions

### scripts.js/ts

This simple extension extends the server to add support for a client side only file called ./scripts.js that will be loaded by the podlet and bundled for production.

// Files
// package.json
// index.js

```js
// index.js
export const name = "scripts-extension";

// tell the file watcher that we want it to watch for changes in the file ./scripts.js or ./scripts.ts
export const files = {
  watch: { client: ["./scripts"] },
}

// tell the build pipeline about ./scripts.js or ./scripts.ts files
// this will mean that when we run: `server build` ./scripts.js or ./scripts.ts will be bundled
// this will also mean that entrypoints will be available when in development mode via /client/<entrypoint> with automatic Esbuild in the fly for each request
export const build = {
  entryPoints: ["./scripts"],
}

// this Fastify plugin adds the scripts file to the podlet manifest file
export const async function server(app, context) {
  // podlet and eik objects setup in podlet and eik extensions at an earlier stage
  const { podlet, eik } = context.meta;
  podlet.js(eik.file("/client/scripts.js"));
}
```

### file change page reload extension

Based on Trygve's example: https://github.com/trygve-lie/prototype-build-server/blob/main/bin/plugin-live-reload.js
This self contained extension adds a Fastify plugin that listens for client file changes reloads the page when detected.

```js
import { WebSocketServer } from 'ws';
import etag from '@fastify/etag';

export const name = "file-change-reload";

export const async function server(app, context) {
  // if we are not in development mode, abort from this extension
  if (!context.development) return;

  app.register(etag, {
    algorithm: 'fnv1a'
  });

  // setup the web socket server
  const wss = new WebSocketServer({
    server: app.server,
    path: '/_/live/reload',
  });

  wss.on('connection', (ws, req) => {
    app.log.debug('live reload - server got connection from browser');

    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('error', (error) => {
      fastify.log.debug('live reload - connection to browser errored');
      fastify.log.error(error);
    });
  });

  wss.on('error', (error) => {
    fastify.log.debug('live reload - server errored');
    fastify.log.error(error);
  });

  const pingpong = setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.isAlive === false) return client.terminate();
      client.isAlive = false;
      client.ping(() => {
          // noop
      });
    });
  }, 30000);

  wss.on('close', () => {
    fastify.log.debug('live reload - server closed');
    clearInterval(pingpong);
  });

  // use the built in file watcher to listen for client file changes and ping the client via
  // the web socket to tell it to reload the page
  context.fileWatcher.on("change:client", () => {
    wss.clients.forEach((client) => {
      client.send('update', () => {
        // Something went wrong....
      });
    });
  })

  fastify.addHook('onClose', (fastify, done) => wss.close(done));

  // inject the live reload script tag into the page so that the browser will
  // connect to the web socket whenever it reloads
  fastify.addHook("onSend", (request, reply, payload, done) => {
    done(null, `${payload}<script src="/_/live/client" type="module"></script>`);
  });

  // serve the live reload code snippet for the browser
  fastify.get('/_/live/client', (request, reply) => {
    reply.type("application/javascript");
    reply.send(`
      const livereload = () => {
          const ws = new WebSocket('ws://' + window.location.host + '/_/live/reload');
          ws.addEventListener("message", (event) => {
            if (event.data === 'update') {
              window.location.reload(true);
            }
          });
          ws.addEventListener("close", () => {
              setTimeout(() => {
                  livereload();
              }, 1000);
          });
          ws.addEventListener("error", () => {
              ws.close();
          });
      }
      livereload();
  `);
  });

  next()
}
```

### Development mode bundling endpoints

This extension example adds dynamic bundling endpoints to the server using the demo code here https://github.com/trygve-lie/prototype-build-server/blob/main/bin/plugin-bundler.js
This allows the server, when in development mode, to request client side files via the urls /_/dynamic/modules and /_/dynamic/files and have files resolved and bundled on the fly
which avoids the need to pre bundle files whenever they change.

```js
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import esbuild from "esbuild";
import etag from '@fastify/etag';

export const name = "dynamic-bundler";

export const async function server(app, context) {
  // if we are not in development mode, abort from this extension
  if (!context.development) return;

  const require = createRequire(context.cwd);

  const build = async ({ entryPoints = [] } = {}) => {
    const result = await esbuild.build({
      resolveExtensions: ['.js', '.ts'],
      legalComments: 'none',
      entryPoints,
      charset: 'utf8',
      plugins: [],
      target: 'esnext',
      bundle: true,
      format: "esm",
      outdir: `${tmpdir()}/podlet-name`,
      minify: true,
      write: false,
    });
    return result.outputFiles[0].text;
  }

  fastify.register(etag, {
    algorithm: 'fnv1a'
  });

  fastify.get('/_/dynamic/modules/*', async (request, reply) => {
    const depname = request.params['*'];
    const filepath = require.resolve(depname, { paths: [cwd] });

    const body = await build({
      entryPoints: [filepath],
    });

    reply.type("application/javascript");
    reply.send(body);
  });

  fastify.get('/_/dynamic/files/:file.js', async (request, reply) => {        
    const filename = request.params['file'];

    const body = await build({
      entryPoints: [`${cwd}/src/${filename}`],
    });

    reply.type("application/javascript");
    reply.send(body);
  });

  next()
}
```