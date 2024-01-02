import { test } from 'tap';
import fastify from 'fastify';
import plugin from '../../plugins/hydrate-support.js';

/** @typedef {import("fastify").FastifyInstance & { hydrate: function, importElement: function }} FastifyInstance */

test('hydrate-support - script tag not injected when not enabled', async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { enabled: false });
  await app.ready();
  // @ts-ignore
  t.equal(app.scriptsList.length, 0, 'should not add script tag');
});

test('hydrate-support - hydrate support script not added when app in enabled mode but development false', async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { enabled: true, development: false });
  await app.ready();
  // @ts-ignore
  t.equal(app.scriptsList.length, 0, 'should not add script tag');
});

test('hydrate-support - hydrate support script added when app in enabled mode and development true', async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { enabled: true, development: true });
  await app.ready();
  t.same(
    // @ts-ignore
    app.scriptsList[0],
    {
      value:
        '/_/dynamic/modules/@lit-labs/ssr-client/lit-element-hydrate-support.js',
      type: 'module',
      strategy: 'beforeInteractive',
    },
    'should add script object to scriptsList',
  );
});

test('hydrate-support - hydrate support script added when app in enabled mode and development true and prefix = /foo', async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, {
    enabled: true,
    development: true,
    prefix: '/foo',
  });
  await app.ready();
  t.same(
    // @ts-ignore
    app.scriptsList[0],
    {
      value:
        '/foo/_/dynamic/modules/@lit-labs/ssr-client/lit-element-hydrate-support.js',
      type: 'module',
      strategy: 'beforeInteractive',
    },
    'should add script object to scriptsList',
  );
});
