import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { afterEach, beforeEach, test } from 'tap';
import fastify from 'fastify';
import { html } from 'lit';
import { execSync } from 'node:child_process';
import importElementPn from '../../plugins/import-element.js';
import plugin from '../../plugins/mode-support.js';

/** @typedef {import("fastify").FastifyInstance & { serverRender: function, clientRender: function, importElement: function }} FastifyInstance */

const tmp = join(tmpdir(), './plugins-mode-support-test-js');

beforeEach(async () => {
  await mkdir(tmp);
  const { default: packageJson } = await import('../../package.json', {
    assert: { type: 'json' },
  });
  await writeFile(
    join(tmp, 'package.json'),
    JSON.stringify({
      name: 'test-app',
      type: 'module',
      dependencies: { lit: packageJson.dependencies.lit },
    }),
  );
  await mkdir(join(tmp, 'dist'));
  await writeFile(
    join(tmp, 'element.js'),
    `
    import { html, LitElement } from "lit";
    export default class Element extends LitElement {
        render() {
            return html\`<div>hello world</div>\`;
        }
    }
    `.trim(),
  );
  execSync('npm install', { cwd: tmp });
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

test('Mode Support - app.serverRender() - Server rendering of a lit element', async (t) => {
  const app = /** @type {FastifyInstance} */ (
    /** @type {unknown} */ (fastify({ logger: false }))
  );
  await app.register(importElementPn, { cwd: tmp, appName: 'custom' });
  await app.register(plugin, {
    appName: 'custom',
    base: '/static',
    development: true,
  });
  await app.importElement(join(tmp, 'element.js'));
  const result = app.serverRender(
    'element',
    html`<custom-element></custom-element>`,
  );
  t.match(result, '<!--lit-part', 'should contain lit comment tags');
  t.match(result, '<custom-element>', 'should contain the correct html tag');
  t.match(
    result,
    `<template shadowroot="open"`,
    'should contain evidence of shadow dom',
  );
  t.match(
    result,
    `<div>hello world</div>`,
    'should contain component rendered markup',
  );
  t.match(
    result,
    `hasOwnProperty("shadowRoot")`,
    'should contain evidence of dsd polyfill',
  );
});

test('Mode Support - app.clientRender() - Client side rendering of a lit element', async (t) => {
  const app = /** @type {FastifyInstance} */ (
    /** @type {unknown} */ (fastify({ logger: false }))
  );
  await app.register(plugin, {
    appName: 'custom',
    base: '/static',
    development: true,
  });
  const result = app.clientRender(
    'element',
    html`<custom-element></custom-element>`,
  );
  t.notMatch(result, '<!--lit-part', 'should not contain lit comment tags');
  t.match(result, '<custom-element>', 'should contain the correct html tag');
  t.notMatch(
    result,
    `<template shadowroot="open"`,
    'should not contain evidence of shadow dom',
  );
  t.notMatch(
    result,
    `<div>hello world</div>`,
    'should not contain component rendered markup',
  );
  t.notMatch(
    result,
    `hasOwnProperty("shadowRoot")`,
    'should not contain evidence of dsd polyfill',
  );
});
