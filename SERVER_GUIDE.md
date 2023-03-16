# Advanced Usage Guide: Customizing the Server with server.js

This guide assumes you have already completed the beginner's guide and are familiar with the basics of setting up and running a Podium podlet server. In this guide, we will explore customizing the server using the `server.js` file, working with the `setContentState` and `setFallbackState` hooks, throwing errors, and adding API routes.

## 1. Create the server.js file

Create a `server.js` file in your project's root directory if it doesn't already exist. This is where you will define your custom server logic.

## 2. Set content and fallback state

Use the `setContentState` and `setFallbackState` hooks to define the state for your content and fallback routes. These hooks allow you to access request headers, route parameters, and query parameters, depending on your validation schema.

```js
// server.js
import { join } from "path";

export default async function server(fastify, { config, podlet }) {
  fastify.setContentState((request, context) => {
    // Access headers, route parameters, and query parameters here
    // Set the state for your content route
  });

  fastify.setFallbackState((request, context) => {
    // Access headers, route parameters, and query parameters here
    // Set the state for your fallback route
  });

  // Rest of your custom server logic
}
```
## 3. Throwing errors

You can throw custom errors using the http-errors package. Throwing errors from `setContentState` or `setFallbackState` will result in the server responding with the specified HTTP status code and message.

```js
// server.js
export default async function server(fastify, { errors }) {
  fastify.setContentState(async () => {
    // Example: throw a 418 "I'm a Teapot" error
    throw errors.ImATeapot();
  });

  // Rest of your custom server logic
}
```

## 4. Add API routes

Define additional API routes for use in the client by using the Fastify object. You can use Podium context values to build paths and send them to the client using `.setContentState`.

```js
// server.js
import { join } from "path";

export default async function server(fastify, { config, podlet }) {
  // Define your API route
  const pathname = join(config.get("app.name"), "api");
  fastify.get(pathname, async (req, reply) => {
    return { key: "value" };
  });

  // Send the API route to the client
  fastify.setContentState((request, context) => ({
    api: new URL(`${context.publicPathname}/api`, context.mountOrigin).href,
  }));

  // Rest of your custom server logic
}
```
Then, on the client side, use initialState to get the API URL and make requests.

```js
// content.js
export default class Content extends PodiumElement {
  static properties = {
    data: { state: true },
  };

  async connectedCallback() {
    super.connectedCallback();
    const result = await fetch(this.initialState.api);
    this.data = await result.json();
  }
}
```

If you need to use Podium proxying for client-side access to podlet API routes, you can do so in `server.js` using the podlet object.

```js
// server.js
import { join } from "path";

export default async function server(fastify, { config, podlet }) {
  // Define your API route with Podium proxying
  const target = join(config.get("app.name"), "api");
  fastify.get(podlet.proxy({ target, name: "api" }), async (req, reply) => {
    return { key: "value" };
  });
}
```

See the [Podium proxy docs](https://podium-lib.io/docs/podlet/proxying) for more information.