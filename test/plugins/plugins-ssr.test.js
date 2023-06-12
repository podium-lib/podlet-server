import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { test, beforeEach, afterEach } from "tap";
import fastify from "fastify";
import { html } from "lit";
import importElementPn from "../../plugins/import-element.js";
import plugin from "../../plugins/ssr.js";
import { execSync } from "node:child_process";

/** @typedef {import("fastify").FastifyInstance & { ssr: function, importElement: function }} FastifyInstance */

const tmp = join(tmpdir(), "./plugins-ssr.test.js");

beforeEach(async (t) => {
  await mkdir(tmp);
  await writeFile(
    join(tmp, "package.json"),
    JSON.stringify({ name: "test-app", type: "module", dependencies: { lit: "*" } })
  );
  await mkdir(join(tmp, "dist"));
  await writeFile(
    join(tmp, "element.js"),
    `
    import { html, LitElement } from "lit";
    export default class Element extends LitElement {
        render() { 
            return html\`<div>hello world</div>\`;
        }
    }
    `.trim()
  );
  execSync("npm install", { cwd: tmp });
});

afterEach(async (t) => {
  await rm(tmp, { recursive: true, force: true });
});

test("server rendering of a lit element", async (t) => {
  const app = /**@type {FastifyInstance}*/ (/**@type {unknown}*/(fastify({ logger: false })));
  await app.register(importElementPn, { cwd: tmp, appName: "custom" });
  await app.register(plugin, { appName: "custom", base: "/assets" });
  await app.importElement(join(tmp, "element.js"));
  const result = app.ssr("content", html`<custom-element><custom-element>`);
  t.match(result, "<!--lit-part", "should contain lit comment tags");
  t.match(result, "<custom-element>", "should contain the correct html tag");
  t.match(result, `<template shadowroot="open"`, "should contain evidence of shadow dom");
  t.match(result, `<div>hello world</div>`, "should contain component rendered markup");
  t.match(result, `hasOwnProperty("shadowRoot")`, "should contain evidence of dsd polyfill");
});
