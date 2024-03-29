import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import convict from 'convict';
import merge from 'lodash.merge';
import { formats } from './config-schema.js';

convict.addFormats(formats);

export default async function configuration({
  schemas = [],
  cwd = process.cwd(),
}) {
  const mergedSchema = {};
  merge(mergedSchema, ...schemas);
  // @ts-ignore
  const config = convict(mergedSchema);

  // we need to do this manually as using NODE_ENV as the default in schema produces some
  // weird results.
  // essentially, everytime you call load, NODE_ENV overwrites the value of app.env again.
  if (process.env.NODE_ENV === 'development') {
    config.set('app.env', 'local');
  }

  // The expectation is that HOST and ENV env vars will be set in production
  // @ts-ignore
  const host = config.get('app.host');
  // @ts-ignore
  const env = config.get('app.env');

  // programmatically set defaults for cases
  // locally, default to development mode
  if (env === 'local') {
    config.load({ app: { development: true, grace: 0 } });
  }

  // name defaults to the name field in package.json
  let name;
  const packagePath = join(cwd, 'package.json');
  if (existsSync(packagePath)) {
    name = JSON.parse(await readFile(packagePath, { encoding: 'utf8' })).name;
    config.load({ app: { name } });
  }

  // if a fallback is defined, set the fallback path
  // this is so that the Podlet object fallback setting does not get set if no fallback is defined.
  if (
    existsSync(join(cwd, 'fallback.js')) ||
    existsSync(join(cwd, 'fallback.ts'))
  ) {
    config.load({ podlet: { fallback: '/fallback' } });
  }

  // auto detect scripts.js
  if (
    existsSync(join(cwd, 'scripts.js')) ||
    existsSync(join(cwd, 'scripts.ts'))
  ) {
    config.load({ assets: { scripts: true } });
  }

  // auto detect lazy.js
  if (existsSync(join(cwd, 'lazy.js')) || existsSync(join(cwd, 'lazy.ts'))) {
    config.load({ assets: { lazy: true } });
  }

  // load comon config overrides if provided
  // common.json is supported so that users can override core config without needing to override for multiple environments or hosts
  if (existsSync(join(cwd, `${join('config', 'common')}.json`))) {
    config.loadFile(join(cwd, `${join('config', 'common')}.json`));
  }

  // load specific overrides if provided
  // fine-grained config overrides. Hosts and env overrides etc.
  const outdatedOverridePath = `${join(
    'config',
    'hosts',
    host,
    'config',
  )}.${env}.json`;
  const newOverridePath = `${join('config', 'hosts', host, env)}.json`;
  if (existsSync(join(cwd, outdatedOverridePath))) {
    // eslint-disable-next-line
    console.warn(
      `Deprecation warning: Your config override use an outdated path "${outdatedOverridePath}". The new format is: "${newOverridePath}"`,
    );
    config.loadFile(join(cwd, outdatedOverridePath));
  } else if (existsSync(join(cwd, newOverridePath))) {
    config.loadFile(join(cwd, newOverridePath));
  }

  // validate the name field of package.json
  if (name === config.get('app.name') && !/^[a-z-]*$/.test(name)) {
    throw new Error(
      `Name field in package.json was not usable as a default app name because it uses characters other than a-z and -.\nYou have 2 choices:\n1. Either set it to a different name using lower case letters and the - character\n2. keep it as is and define the app name in config.\nA good place for this is in /config/common.json\neg. { "app": { "name": "my-app-name-here" } }"`,
    );
  }

  // If app.base is not explicitly user set, then default it to the same as app.name with a leading slash
  if (config.get('app.base') === '') {
    config.load({ app: { base: `/${config.get('app.name')}` } });
  }

  // If development.liveReload.port is not explicitly user set, then default it to app.port + 1
  if (!config.get('development.liveReload.port')) {
    config.set('development.liveReload.port', config.get('app.port') + 1);
  }

  // once all is setup, validate.
  config.validate();

  return config;
}
