import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { afterEach, beforeEach, test } from 'tap';
import { Extensions } from '../../lib/resolvers/extensions.js';

const tmp = join(tmpdir(), './load-extensions.test.js');

beforeEach(async () => {
  await mkdir(tmp);
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

test('No extensions present', async (t) => {
  const extensions = await Extensions.load({ cwd: tmp });
  t.equal(extensions.extensions.size, 0);
});

test('One extension present', async (t) => {
  await writeFile(
    join(tmp, 'package.json'),
    JSON.stringify({
      name: 'test-app',
      type: 'module',
      podium: { extensions: { 'podlet-server': ['test-extension'] } },
    }),
  );
  await mkdir(join(tmp, 'node_modules'));
  await mkdir(join(tmp, 'node_modules', 'test-extension'));
  await writeFile(
    join(tmp, 'node_modules', 'test-extension', 'package.json'),
    JSON.stringify({
      name: 'test-extension',
      version: '1.0.0',
      main: 'index.js',
      type: 'module',
    }),
  );
  await writeFile(
    join(tmp, 'node_modules', 'test-extension', 'index.js'),
    `
    export const config = {};
    export const build = () => { return [] };
    export const document = () => {};
    export const server = async (app) => {};
  `,
  );

  const extensions = await Extensions.load({ cwd: tmp });
  t.equal(extensions.extensions.size, 1);

  const extension = extensions.extensions.get('test-extension');
  t.equal(extension.meta.name, 'test-extension');
  t.ok(extension.server);
  t.ok(extension.config);
  t.ok(extension.build);
  t.ok(extension.document);
});

test('Two extensions present', async (t) => {
  await writeFile(
    join(tmp, 'package.json'),
    JSON.stringify({
      name: 'test-app',
      type: 'module',
      podium: {
        extensions: {
          'podlet-server': ['test-extension-1', 'test-extension-2'],
        },
      },
    }),
  );
  await mkdir(join(tmp, 'node_modules'));
  await mkdir(join(tmp, 'node_modules', 'test-extension-1'));
  await mkdir(join(tmp, 'node_modules', 'test-extension-2'));
  await writeFile(
    join(tmp, 'node_modules', 'test-extension-1', 'package.json'),
    JSON.stringify({
      name: 'test-extension-1',
      version: '1.0.0',
      main: 'index.js',
      type: 'module',
    }),
  );
  await writeFile(
    join(tmp, 'node_modules', 'test-extension-2', 'package.json'),
    JSON.stringify({
      name: 'test-extension-2',
      version: '1.0.0',
      main: 'index.js',
      type: 'module',
    }),
  );
  await writeFile(
    join(tmp, 'node_modules', 'test-extension-1', 'index.js'),
    `
    export const config = {};
    export const build = () => { return [] };
    export const document = () => {};
    export const server = async (app) => {};
  `,
  );
  await writeFile(
    join(tmp, 'node_modules', 'test-extension-2', 'index.js'),
    `
    export const config = {};
    export const build = () => { return [] };
    export const document = () => {};
    export const server = async (app) => {};
  `,
  );

  const extensions = await Extensions.load({ cwd: tmp });
  t.equal(extensions.extensions.size, 2);

  const extension1 = extensions.extensions.get('test-extension-1');
  t.equal(extension1.meta.name, 'test-extension-1');
  t.ok(extension1.server);
  t.ok(extension1.config);
  t.ok(extension1.build);
  t.ok(extension1.document);

  const extension2 = extensions.extensions.get('test-extension-2');
  t.equal(extension2.meta.name, 'test-extension-2');
  t.ok(extension2.server);
  t.ok(extension2.config);
  t.ok(extension2.build);
  t.ok(extension2.document);
});
