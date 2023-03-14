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
  const response = await result.text()
  t.equal(response, `<div>hello world</div>`, "should not inject live reload script");
  await app.close();
});

test("live reload script injected when content-type is html and app in development mode", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { development: true });
  app.get("/", (request, reply) => {
    reply.type("text/html");
    reply.send("<div>hello world</div>");
  });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/`);
  const response = await result.text();
  t.match(response, `new EventSource('http://localhost:6935/esbuild')`, "should inject live reload script");
  await app.close();
});

test("live reload script injected with custom port", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { development: true, liveReloadPort: 1234 });
  app.get("/", (request, reply) => {
    reply.type("text/html");
    reply.send("<div>hello world</div>");
  });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/`);
  const response = await result.text();
  t.match(response, `new EventSource('http://localhost:1234/esbuild')`, "should inject live reload script");
  await app.close();
});

test("live reload script not injected when content-type is not html and app in development mode", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { development: true });
  app.get("/", (request, reply) => {
    reply.send({});
  });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/`);
  const response = await result.text();
  t.equal(response, `{}`, "should not inject live reload script");
  await app.close();
});
