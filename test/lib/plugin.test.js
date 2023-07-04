import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { test, beforeEach, afterEach } from "tap";
import fastify from "fastify";
import plugin from "../../lib/plugin.js";
// import { Extensions } from "../../lib/extensions/extensions.js";
// import { Local } from "../../lib/local.js";
// import { Core } from "../../lib/core.js";
// import configuration from "../../lib/config.js";
// import { State } from "../../lib/state.js";
import convict from "convict";

const tmp = join(tmpdir(), "./plugin.test.js");

const contentFile = `
import { html, LitElement } from "lit";
export default class Element extends LitElement {
  render() { 
    return html\`<div>hello world</div>\`;
  }
}
`.trim();

async function setupConfig() {
  // const state = new State();
  // const core = await Core.load();
  // const extensions = await Extensions.load(path);
  // const local = await Local.load(path);
  // state.set("core", core);
  // state.set("extensions", extensions);
  // state.set("local", local);
  // const config = await configuration({ cwd: path, schemas: state.config });
  // // @ts-ignore
  // config.set("app.port", 0);
  // config.set("app.logLevel", "FATAL");
  // return { state, config, extensions };
  const config = convict({});
  // @ts-ignore
  config.set("app.name", "test-app");
  config.set("app.port", 0);
  config.set("assets.base", "/static");
  config.set("podlet.version", "1.0.0");
  config.set("podlet.pathname", "/");
  config.set("podlet.manifest", "/manifest.json");
  config.set("podlet.content", "/");
  config.set("podlet.fallback", "");
  config.set("app.development", false);
  config.set("app.locale", "en");
  config.set("assets.lazy", false);
  config.set("assets.scripts", false);
  config.set("app.compression", false);
  config.set("app.grace", 0);
  config.set("metrics.timing.timeAllRoutes", false);
  config.set("metrics.timing.groupStatusCodes", false);
  config.set("app.mode", "hydrate");
  config.set("development.liveReload.port", 8081);
  return config;
}

beforeEach(async (t) => {
  await mkdir(tmp);
  await mkdir(join(tmp, "schemas"));
  await mkdir(join(tmp, "locale"));
  await writeFile(
    join(tmp, "package.json"),
    JSON.stringify({ name: "test-app", type: "module", dependencies: { lit: "*" } })
  );
  await mkdir(join(tmp, "dist"));
  await writeFile(join(tmp, "content.js"), contentFile);
  execSync("npm install", { cwd: tmp });
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

test("simple app with content route", async (t) => {
  const app = fastify({ logger: false });
  const config = await setupConfig();

  await app.register(plugin, {
    cwd: tmp,
    config,
  });
  const address = await app.listen({ port: 0 });
  const manifest = await fetch(`${address}/manifest.json`);
  const content = await fetch(`${address}/`);
  const markup = await content.text();
  t.equal(manifest.status, 200, "manifest file should be sucessfully served");
  t.equal(content.status, 200, "content file should be sucessfully served");
  t.match(markup, "<!--lit-part", "should contain lit comment tags");
  t.match(markup, "<test-app-content", "should contain the correct html tag");
  t.match(markup, `<template shadowroot="open"`, "should contain evidence of shadow dom");
  t.match(markup, `<div>hello world</div>`, "should contain component rendered markup");
  t.match(markup, `hasOwnProperty("shadowRoot")`, "should contain evidence of dsd polyfill");
  await app.close();
});

test("simple app with fallback route", async (t) => {
  await writeFile(join(tmp, "fallback.js"), contentFile);
  const app = fastify({ logger: false });
  const config = await setupConfig();
  config.set("podlet.fallback", "/fallback");
  await app.register(plugin, {
    cwd: tmp,
    config,
  });
  const address = await app.listen({ port: 0 });
  const fallback = await fetch(`${address}/fallback`);
  const markup = await fallback.text();
  t.equal(fallback.status, 200, "fallback file should be sucessfully served");
  t.match(markup, "<!--lit-part", "should contain lit comment tags");
  t.match(markup, "<test-app-fallback", "should contain the correct html tag");
  t.match(markup, `<template shadowroot="open"`, "should contain evidence of shadow dom");
  t.match(markup, `<div>hello world</div>`, "should contain component rendered markup");
  t.match(markup, `hasOwnProperty("shadowRoot")`, "should contain evidence of dsd polyfill");
  await app.close();
});

test("serialising state between server and client", async (t) => {
  await writeFile(join(tmp, "fallback.js"), contentFile);
  const app = fastify({ logger: false });
  const config = await setupConfig();
  config.set("podlet.fallback", "/fallback");
  await app.register(plugin, {
    cwd: tmp,
    config,
  });
  await app.register(async function server(app) {
    // @ts-ignore
    app.setContentState(async () => {
      return { initialContentState: "serialised" };
    });
    // @ts-ignore
    app.setFallbackState(async () => {
      return { initialFallbackState: "serialised" };
    });
  });
  const address = await app.listen({ port: 0 });
  const content = await fetch(`${address}/`);
  const fallback = await fetch(`${address}/fallback`);
  const cMarkup = await content.text();
  const fMarkup = await fallback.text();
  t.match(cMarkup, `initialContentState`);
  t.notMatch(cMarkup, `initialFallbackState`);
  t.match(fMarkup, `initialFallbackState`);
  t.notMatch(fMarkup, `initialContentState`);
  await app.close();
});

test("scripts", async (t) => {
  await writeFile(join(tmp, "fallback.js"), contentFile);
  const app = fastify({ logger: false });
  const config = await setupConfig();
  config.set("podlet.fallback", "/fallback");
  config.set("assets.scripts", true);
  config.set("assets.base", "/assets");
  await app.register(plugin, {
    cwd: tmp,
    config,
  });
  const address = await app.listen({ port: 0 });
  const manifest = await fetch(`${address}/manifest.json`);
  const content = await fetch(`${address}/`);
  const fallback = await fetch(`${address}/fallback`);
  const mMarkup = await manifest.text();
  const cMarkup = await content.text();
  const fMarkup = await fallback.text();
  t.notMatch(mMarkup, `scripts.js`);
  t.match(cMarkup, `/assets/client/scripts.js`);
  t.match(fMarkup, `/assets/client/scripts.js`);
  await app.close();
});

test("scripts: plugin mounted under /app, development mode urls", async (t) => {
  await writeFile(join(tmp, "fallback.js"), contentFile);
  const app = fastify({ logger: false });
  const config = await setupConfig();
  config.set("podlet.fallback", "/fallback");
  config.set("assets.scripts", true);
  config.set("app.base", "/app");
  config.set("app.development", true);
  await app.register(plugin, {
    prefix: "/app",
    cwd: tmp,
    config,
  });
  const address = await app.listen({ port: 0 });
  const manifest = await fetch(`${address}/app/manifest.json`);
  const content = await fetch(`${address}/app`);
  const fallback = await fetch(`${address}/app/fallback`);
  const mMarkup = await manifest.text();
  const cMarkup = await content.text();
  const fMarkup = await fallback.text();
  t.notMatch(mMarkup, `scripts.js`);
  t.match(cMarkup, `/app/_/dynamic/files/scripts.js`);
  t.match(fMarkup, `/app/_/dynamic/files/scripts.js`);
  await app.close();
});

test("lazy", async (t) => {
  await writeFile(join(tmp, "fallback.js"), contentFile);
  const app = fastify({ logger: false });
  const config = await setupConfig();
  config.set("podlet.fallback", "/fallback");
  config.set("assets.lazy", true);
  config.set("assets.base", "/assets");
  await app.register(plugin, {
    cwd: tmp,
    config,
  });
  const address = await app.listen({ port: 0 });
  const manifest = await fetch(`${address}/manifest.json`);
  const content = await fetch(`${address}/`);
  const fallback = await fetch(`${address}/fallback`);
  const mMarkup = await manifest.text();
  const cMarkup = await content.text();
  const fMarkup = await fallback.text();
  t.notMatch(mMarkup, `lazy.js`);
  t.match(cMarkup, `/assets/client/lazy.js`);
  t.match(fMarkup, `/assets/client/lazy.js`);
  await app.close();
});

test("lazy: plugin mounted under /app, development mode urls", async (t) => {
  await writeFile(join(tmp, "fallback.js"), contentFile);
  const app = fastify({ logger: false });
  const config = await setupConfig();
  config.set("podlet.fallback", "/fallback");
  config.set("assets.lazy", true);
  config.set("app.base", "/app");
  config.set("app.development", true);
  await app.register(plugin, {
    prefix: "/app",
    cwd: tmp,
    config,
  });
  const address = await app.listen({ port: 0 });
  const manifest = await fetch(`${address}/app/manifest.json`);
  const content = await fetch(`${address}/app`);
  const fallback = await fetch(`${address}/app/fallback`);
  const mMarkup = await manifest.text();
  const cMarkup = await content.text();
  const fMarkup = await fallback.text();
  t.notMatch(mMarkup, `lazy.js`);
  t.match(cMarkup, `/app/_/dynamic/files/lazy.js`);
  t.match(fMarkup, `/app/_/dynamic/files/lazy.js`);
  await app.close();
});

test("schemas: content.json", async (t) => {
  await writeFile(
    join(tmp, "schemas", "content.json"),
    JSON.stringify({
      querystring: {
        type: "object",
        properties: {
          asd: { type: "integer" },
        },
        required: ["test"],
      },
    })
  );
  const app = fastify({ logger: false });
  const config = await setupConfig();
  await app.register(plugin, {
    cwd: tmp,
    config,
  });
  const address = await app.listen({ port: 0 });
  const noQueryParm = await fetch(`${address}/`);
  const queryParam = await fetch(`${address}?test=1`);
  t.equal(noQueryParm.status, 400);
  t.equal(queryParam.status, 200);
  await app.close();
});

test("schemas: fallback.json", async (t) => {
  await writeFile(join(tmp, "fallback.js"), contentFile);
  await writeFile(
    join(tmp, "schemas", "fallback.json"),
    JSON.stringify({
      querystring: {
        type: "object",
        properties: {
          asd: { type: "integer" },
        },
        required: ["test"],
      },
    })
  );
  const app = fastify({ logger: false });
  const config = await setupConfig();
  config.set("podlet.fallback", "/fallback");
  await app.register(plugin, {
    cwd: tmp,
    config,
  });
  const address = await app.listen({ port: 0 });
  const noQueryParm = await fetch(`${address}/fallback`);
  const queryParam = await fetch(`${address}/fallback?test=1`);
  t.equal(noQueryParm.status, 400);
  t.equal(queryParam.status, 200);
  await app.close();
});

// // test("build plugin", async (t) => {})
// // test("locale", async (t) => {})
// // test("metrics", async (t) => {})
// // test("typescript", async (t) => {})
// // test("errors", async (t) => {})
