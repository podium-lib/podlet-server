import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as os from 'node:os';
import { join } from 'node:path';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { afterEach, beforeEach, test } from 'tap';
import configuration from '../../lib/config.js';
import { build } from '../../api/build.js';
import { Extensions } from '../../lib/resolvers/extensions.js';
import { Local } from '../../lib/resolvers/local.js';
import { Core } from '../../lib/resolvers/core.js';
import { State } from '../../lib/state.js';

const tmpDir = join(os.tmpdir(), 'build-test');
const tmp = join(tmpDir, 'build-test-js');

async function setupConfig({ cwd }) {
  const state = new State({ cwd });
  state.set('core', await Core.load());
  state.set('extensions', await Extensions.load({ cwd }));
  state.set('local', await Local.load({ cwd }));

  const config = await configuration({ cwd, schemas: await state.config() });

  // @ts-ignore
  config.set('app.port', 0);
  config.set('app.logLevel', 'FATAL');
  return { state, config };
}

beforeEach(async () => {
  await mkdir(tmp, { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

async function createFakeBuildPluginFiles(pluginName = 'fake-extension') {
  await writeFile(
    join(tmpDir, 'package.json'),
    JSON.stringify({
      name: 'fake-app',
      type: 'module',
      podium: {
        extensions: { 'podlet-server': [pluginName] },
      },
    }),
  );
  await mkdir(join(tmpDir, 'node_modules'));
  await mkdir(join(tmpDir, 'node_modules', pluginName));
  await writeFile(
    join(tmpDir, 'node_modules', pluginName, 'package.json'),
    JSON.stringify({
      name: pluginName,
      version: '1.0.0',
      type: 'module',
      main: 'index.js',
    }),
  );
}

async function scaffoldAppInTempDir() {
  const { default: packageJson } = await import('../../package.json', {
    assert: { type: 'json' },
  });
  await writeFile(
    join(tmp, 'package.json'),
    JSON.stringify({
      name: 'test-app',
      type: 'module',
      dependencies: {
        lit: packageJson.dependencies.lit,
        '@lit-labs/ssr-client':
          packageJson.dependencies['@lit-labs/ssr-client'],
      },
    }),
  );
  execSync('npm install', { cwd: tmp });
}

test('All possible supported JavaScript files defined and built', async (t) => {
  const { state, config } = await setupConfig({ cwd: tmp });
  await scaffoldAppInTempDir();
  await writeFile(join(tmp, 'content.js'), 'export default {}');
  await writeFile(join(tmp, 'fallback.js'), 'export default {}');
  await writeFile(join(tmp, 'scripts.js'), 'export default {}');
  await writeFile(join(tmp, 'lazy.js'), 'export default {}');
  // @ts-ignore
  config.set('app.base', '/test-app');
  // @ts-ignore
  config.set('app.name', 'test-app');
  await build({ state, config, cwd: tmp });

  // server versions built into server directory
  t.ok(existsSync(join(tmp, 'dist', 'server', 'content.js')));
  t.ok(existsSync(join(tmp, 'dist', 'server', 'fallback.js')));
  // entrypoints created via writeFile
  t.ok(existsSync(join(tmp, 'dist', '.build', 'content-entrypoint.js')));
  t.ok(existsSync(join(tmp, 'dist', '.build', 'content.js')));
  t.ok(existsSync(join(tmp, 'dist', '.build', 'scripts.js')));
  t.ok(existsSync(join(tmp, 'dist', '.build', 'lazy.js')));
  // esbuild versions created to apply plugins
  t.ok(existsSync(join(tmp, 'dist', '.build', 'fallback-entrypoint.js')));
  t.ok(existsSync(join(tmp, 'dist', '.build', 'fallback.js')));
  t.ok(existsSync(join(tmp, 'dist', '.build', 'scripts.js')));
  t.ok(existsSync(join(tmp, 'dist', '.build', 'lazy.js')));
  // final rollup versions built into client directory
  t.ok(existsSync(join(tmp, 'dist', 'client', 'content.js')));
  t.ok(existsSync(join(tmp, 'dist', 'client', 'fallback.js')));
  t.ok(existsSync(join(tmp, 'dist', 'client', 'scripts.js')));
  t.ok(existsSync(join(tmp, 'dist', 'client', 'lazy.js')));
});

test('All possible supported Typescript files defined and built', async (t) => {
  const { state, config } = await setupConfig({ cwd: tmp });
  await scaffoldAppInTempDir();
  await writeFile(join(tmp, 'content.ts'), 'export default {}');
  await writeFile(join(tmp, 'fallback.ts'), 'export default {}');
  await writeFile(join(tmp, 'scripts.ts'), 'export default {}');
  await writeFile(join(tmp, 'lazy.ts'), 'export default {}');
  // @ts-ignore
  config.set('app.base', '/test-app');
  // @ts-ignore
  config.set('app.name', 'test-app');
  await build({ state, config, cwd: tmp });

  // server versions built into server directory
  t.ok(existsSync(join(tmp, 'dist', 'server', 'content.js')));
  t.ok(existsSync(join(tmp, 'dist', 'server', 'fallback.js')));
  // entrypoints created via writeFile
  t.ok(existsSync(join(tmp, 'dist', '.build', 'content-entrypoint.js')));
  t.ok(existsSync(join(tmp, 'dist', '.build', 'content.js')));
  t.ok(existsSync(join(tmp, 'dist', '.build', 'scripts.js')));
  t.ok(existsSync(join(tmp, 'dist', '.build', 'lazy.js')));
  // esbuild versions created to apply plugins
  t.ok(existsSync(join(tmp, 'dist', '.build', 'fallback-entrypoint.js')));
  t.ok(existsSync(join(tmp, 'dist', '.build', 'fallback.js')));
  t.ok(existsSync(join(tmp, 'dist', '.build', 'scripts.js')));
  t.ok(existsSync(join(tmp, 'dist', '.build', 'lazy.js')));
  // final rollup versions built into client directory
  t.ok(existsSync(join(tmp, 'dist', 'client', 'content.js')));
  t.ok(existsSync(join(tmp, 'dist', 'client', 'fallback.js')));
  t.ok(existsSync(join(tmp, 'dist', 'client', 'scripts.js')));
  t.ok(existsSync(join(tmp, 'dist', 'client', 'lazy.js')));
});

test('Supports a plugin returning one build plugin', async () => {
  await createFakeBuildPluginFiles();
  await writeFile(
    join(tmpDir, 'node_modules', 'fake-extension', 'index.js'),
    `
    export const build = (config) => ({
      name: "fake-build-plugin",
      setup(build) {}
    })
  `,
  );

  const { state, config } = await setupConfig({ cwd: tmpDir });
  await build({ state, config, cwd: tmp });
});

test('Supports a plugin returning multiple build plugins', async () => {
  await createFakeBuildPluginFiles();
  await writeFile(
    join(tmpDir, 'node_modules', 'fake-extension', 'index.js'),
    `
    export const build = (config) => [{
      name: "fake-build-plugin",
      setup(build) {}
    }, {
      name: "super-fake-build-plugin",
      setup(build) {}
    }]
  `,
  );

  const { state, config } = await setupConfig({ cwd: tmpDir });
  await build({ state, config, cwd: tmp });
});

test('Build plugins receive the configuration object', async (t) => {
  const pluginName = 'fake-extension-with-config';
  await createFakeBuildPluginFiles(pluginName);

  // A build plugin which writes the passed in config to a file for verification
  const debugConfigFile = join(tmpDir, 'config.txt');
  await writeFile(
    join(tmpDir, 'node_modules', pluginName, 'index.js'),
    `
    import fs from "fs"
    export const build = (config) => [{
      name: "fake-build-plugin",
      setup(build) {
        fs.writeFileSync("${debugConfigFile}", JSON.stringify(config))
      }
    }]
  `,
  );

  const { state, config } = await setupConfig({ cwd: tmpDir });
  await build({ state, config, cwd: tmpDir });

  const file = (await readFile(debugConfigFile)).toString('utf-8');
  t.equal(
    await config.load(JSON.parse(file).config),
    config,
    'Verified valid config is accessible',
  );
  await rm(debugConfigFile);
});
