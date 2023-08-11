import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { beforeEach, test } from 'tap';
import fastify from 'fastify';
import Podlet from '@podium/podlet';
import plugin from '../../plugins/document.js';

const tmp = join(tmpdir(), './plugins-document.test.js');

beforeEach(async (t) => {
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp);
  await writeFile(
    join(tmp, 'package.json'),
    JSON.stringify({ name: 'test', type: 'module' }),
  );
  t.context.app = fastify({ logger: false });
});

test('Basic document template is read and loaded', async (t) => {
  const { app } = t.context;
  await writeFile(
    join(tmp, 'document.js'),
    'export default (incoming, body) => `hello world`;',
  );
  const podlet = new Podlet({ name: 'test', version: '1.0.0', pathname: '/' });
  await app.register(plugin, { cwd: tmp, development: true, podlet });
  // @ts-ignore
  t.equal(
    podlet._view(),
    'hello world',
    'document.js file loaded and registered as podlet view',
  );
  await rm(tmp, { recursive: true, force: true });
});

test('Basic typescript document template is read and loaded', async (t) => {
  const { app } = t.context;
  await writeFile(
    join(tmp, 'document.ts'),
    'export default (incoming, body) => `hello world`;',
  );
  const podlet = new Podlet({ name: 'test', version: '1.0.0', pathname: '/' });
  await app.register(plugin, { cwd: tmp, development: true, podlet });
  // @ts-ignore
  t.equal(
    podlet._view(),
    'hello world',
    'document.ts file loaded and registered as podlet view',
  );
  await rm(tmp, { recursive: true, force: true });
});
