import { test } from "tap";
import fastify from "fastify";
import plugin from "../../plugins/script.js";

/** @typedef {import("fastify").FastifyInstance & { script: function }} FastifyInstance */

test("script function returns a script tag when development false", async (t) => {
  const app = /**@type {FastifyInstance}*/ (/**@type {unknown}*/(fastify({ logger: false })));
  await app.register(plugin);
  t.equal(app.script("/some/url"), `<script type="module" src="/some/url"></script>`, "should return a script tag");
});

test("script function returns a lazy script tag when lazy true", async (t) => {
  const app = /**@type {FastifyInstance}*/ (/**@type {unknown}*/(fastify({ logger: false })));
  await app.register(plugin);
  t.equal(app.script("/some/url", { lazy: true }), `<script type="module">addEventListener('load',()=>import('/some/url'))</script>`, "should return a script tag");
});

test("script function returns empty string when development false and dev flag passed", async (t) => {
  const app = /**@type {FastifyInstance}*/ (/**@type {unknown}*/(fastify({ logger: false })));
  await app.register(plugin);
  t.equal(app.script("/some/url", { dev: true }), "", "should return an empty string");
});

test("script function returns script when development true and dev flag passed", async (t) => {
  const app = /**@type {FastifyInstance}*/ (/**@type {unknown}*/(fastify({ logger: false })));
  await app.register(plugin, { development: true });
  t.equal(app.script("/some/url", { dev: true }), `<script type="module" src="/some/url"></script>`, "should return an empty string");
});
