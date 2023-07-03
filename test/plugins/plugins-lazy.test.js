import { test } from "tap";
import fastify from "fastify";
import plugin from "../../plugins/lazy.js";

test("lazy script tag not injected when not enabled", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin);
  app.get("/", (request, reply) => {
    reply.type("text/html");
    reply.send("<div>hello world</div>");
  });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/`);
  const response = await result.text()
  t.equal(response, `<div>hello world</div>`, "should not inject lazy script tag");
  await app.close();
});

test("lazy script tag injected when content-type is html and app in enabled mode", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { enabled: true, base: "/static" });
  app.get("/", (request, reply) => {
    reply.type("text/html");
    reply.send("<div>hello world</div>");
  });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/`);
  const response = await result.text();
  t.match(response, `<div>hello world</div>`, "should inject lazy script tag");
  t.match(response, `addEventListener('load',()=>import('/static/client/lazy.js'))`, "should inject lazy script tag");
  await app.close();
});

test("lazy script tag injected correctly in development mode", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { enabled: true, base: "/static", development: true });
  app.get("/", (request, reply) => {
    reply.type("text/html");
    reply.send("<div>hello world</div>");
  });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/`);
  const response = await result.text();
  t.match(response, `<div>hello world</div>`, "should inject lazy script tag");
  t.match(response, `addEventListener('load',()=>import('/_/dynamic/files/lazy.js'))`, "should inject lazy script tag");
  await app.close();
});

test("lazy script tag injected correctly in development mode and mounted under a base path", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { enabled: true, prefix: "/my-app", base: "/static", development: true });
  app.get("/", (request, reply) => {
    reply.type("text/html");
    reply.send("<div>hello world</div>");
  });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/`);
  const response = await result.text();
  t.match(response, `<div>hello world</div>`, "should inject lazy script tag");
  t.match(response, `addEventListener('load',()=>import('/my-app/_/dynamic/files/lazy.js'))`, "should inject lazy script tag");
  await app.close();
});

test("lazy script tag not injected when content-type is not html and plugin in enabled mode", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { enabled: true, base: "/static" });
  app.get("/", (request, reply) => {
    reply.send({});
  });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/`);
  const response = await result.text();
  t.equal(response, `{}`, "should not inject scripts script tag");
  await app.close();
});
