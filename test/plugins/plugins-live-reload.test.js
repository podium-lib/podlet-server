import { test } from "tap";
import fastify from "fastify";
import plugin from "../../plugins/live-reload.js";

test("live reload script not injected when not in development mode", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin);
  app.get("/", (request, reply) => {
    reply.type("text/html");
    reply.send("<div>hello world</div>");
  });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/`);
  const response = await result.text();
  t.equal(response, `<div>hello world</div>`, "should not inject live reload script");
  await app.close();
});

test("live reload script injected when content-type is html and app in development mode, no prefix", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { development: true, port: 1234, webSocketServerPort: 1235 });
  app.get("/", (request, reply) => {
    reply.type("text/html");
    reply.send("<div>hello world</div>");
  });
  const address = await app.listen({ port: 1234 });

  const result = await fetch(`${address}/`);
  const response = await result.text();
  t.match(
    response,
    `<script src="http://localhost:1234/_/live/client" type="module"></script>`,
    "should inject live reload client script tag"
  );

  const result2 = await fetch("http://localhost:1234/_/live/client");
  const response2 = await result2.text();
  t.match(
    response2,
    `const ws = new WebSocket(\`ws://\${host}:1235\`);`,
    "should inject correct live reload script URL"
  );
  await app.close();
});

test("live reload script injected in wrapping plugin with prefix /foo", async (t) => {
  const app = fastify({ logger: false });
  await app.register(
    async (f) => {
      await f.register(plugin, { development: true, port: 1235, prefix: "/foo", webSocketServerPort: 1236 });
      f.get("/", (request, reply) => {
        reply.type("text/html");
        reply.send("<div>hello world</div>");
      });
    },
    { prefix: "/foo" }
  );
  const address = await app.listen({ port: 1235 });

  const result = await fetch(`${address}/foo`);
  const response = await result.text();
  t.match(
    response,
    `<script src="http://localhost:1235/foo/_/live/client" type="module"></script>`,
    "should inject live reload client script tag"
  );

  const result2 = await fetch("http://localhost:1235/foo/_/live/client");
  const response2 = await result2.text();
  t.match(
    response2,
    `const ws = new WebSocket(\`ws://\${host}:1236\`);`,
    "should inject correct live reload script URL"
  );
  await app.close();
});

test("live reload script not injected when content-type is not html and app in development mode", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { development: true, port: 1236 });
  app.get("/", (request, reply) => {
    reply.send({});
  });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/`);
  const response = await result.text();
  t.equal(response, `{}`, "should not inject live reload script");
  await app.close();
});
