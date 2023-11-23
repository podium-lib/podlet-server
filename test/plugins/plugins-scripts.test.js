import { test } from 'tap';
import fastify from 'fastify';
import plugin from '../../plugins/scripts.js';

test('scripts - script tag not injected when not enabled', async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin);
  await app.listen({ port: 0 });
  // @ts-ignore
  t.equal(app.scriptsList.length, 0, 'should not add script tag');
  await app.close();
});

test('scripts - script tag added to manifest.json when app in enabled mode', async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { enabled: true, base: '/static' });
  await app.listen({ port: 0 });
  t.same(
    // @ts-ignore
    app.scriptsList[0],
    {
      value: '/static/client/scripts.js',
      type: 'module',
      strategy: 'afterInteractive',
    },
    'should add scripts object to scriptsList',
  );
  await app.close();
});
