import { test } from "tap";
import fastify from "fastify";
import plugin from "../../plugins/scripts.js";

test("scripts tag not injected when not enabled", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin);
  app.get("/", (request, reply) => {
    reply.type("text/html");
    reply.send("<div>hello world</div>");
  });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/`);
  const response = await result.text()
  t.equal(response, `<div>hello world</div>`, "should not inject script tag");
  await app.close();
});

test("scripts script tag injected when content-type is html and app in enabled mode", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { enabled: true, base: "/static" });
  app.get("/", (request, reply) => {
    reply.type("text/html");
    reply.send("<div>hello world</div>");
  });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/`);
  const response = await result.text();
  t.equal(response, `<div>hello world</div><script type=\"module\" src=\"/static/client/scripts.js\"></script>`, "should inject scripts script tag");
  await app.close();
});

test("scripts script tag not injected when content-type is not html and plugin in enabled mode", async (t) => {
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
