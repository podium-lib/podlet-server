import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { afterEach, beforeEach, test } from 'tap';
import fastify from 'fastify';
import { execSync } from 'node:child_process';
import importElementPn from '../../plugins/import-element.js';
import plugin from '../../plugins/csr.js';

/** @typedef {import("fastify").FastifyInstance & { csr: function, importElement: function }} FastifyInstance */

const tmp = join(tmpdir(), './plugins-csr.test.js');

beforeEach(async () => {
  await mkdir(tmp);
  await writeFile(
    join(tmp, 'package.json'),
    JSON.stringify({
      name: 'test-app',
      type: 'module',
      dependencies: { lit: '*' },
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

test('server rendering of a lit element with hydration support', async (t) => {
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
  const result = app.csr('element', `<custom-element><custom-element>`);
  t.notMatch(result, '<!--lit-part', 'should contain lit comment tags');
  t.notMatch(
    result,
    `<template shadowroot="open"`,
    'should contain evidence of shadow dom',
  );
  t.notMatch(
    result,
    `<div>hello world</div>`,
    'should contain component rendered markup',
  );
  t.notMatch(
    result,
    `hasOwnProperty("shadowRoot")`,
    'should contain evidence of dsd polyfill',
  );
  t.match(result, '<custom-element>', 'should contain the correct html tag');
  t.match(
    result,
    `import El from '/_/dynamic/files/element.js';`,
    'should contain client side element import',
  );
  t.match(
    result,
    `customElements.define("custom-element",El);`,
    'should contain client side element registration',
  );
});
