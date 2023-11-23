import { test } from 'tap';
import fastify from 'fastify';
import plugin from '../../plugins/lazy.js';

test('lazy script tag not injected when not enabled', async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin);
  await app.ready();
  // @ts-ignore
  t.equal(app.scriptsList.length, 0, 'should not inject lazy script tag');
});

test('lazy script tag injected when content-type is html and app in enabled mode', async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { enabled: true, base: '/static' });
  await app.ready();
  t.match(
		// @ts-ignore
    app.scriptsList[0],
    { value: '/static/client/lazy.js', type: 'module', strategy: 'lazy' },
    'should add lazy script object to scriptsList',
  );
});

test('lazy script tag injected correctly in development mode', async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, {
    enabled: true,
    base: '/static',
    development: true,
  });
  await app.ready();
  t.match(
		// @ts-ignore
    app.scriptsList[0],
    { value: '/_/dynamic/files/lazy.js', type: 'module', strategy: 'lazy' },
    'should add lazy script object to scriptsList',
  );
});

test('lazy script tag injected correctly in development mode and mounted under a base path', async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, {
    enabled: true,
    prefix: '/my-app',
    base: '/static',
    development: true,
  });
  await app.ready();
  t.match(
		// @ts-ignore
    app.scriptsList[0],
    {
      value: '/my-app/_/dynamic/files/lazy.js',
      type: 'module',
      strategy: 'lazy',
    },
    'should add lazy script object to scriptsList',
  );
});
