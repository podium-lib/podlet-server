import { beforeEach, test } from 'tap';
import fastify from 'fastify';
// import podletPlugin from '../../plugins/podlet.js';
import plugin from '../../plugins/docs.js';
import validationPlugin from '../../plugins/validation.js';
import Podlet from '@podium/podlet';
import convict from 'convict';

const mockPodlet = (options = {}) =>
  new Podlet({
    ...{ name: 'foo', version: '1.0.0', pathname: '/' },
    ...options,
  });

const mockConfig = (options = {}) =>
  convict({
    app: {
      development: { format: Boolean, default: options.development || true },
      base: { format: String, default: options.base || '/' },
    },
    podlet: {
      content: { format: String, default: options.content || '/' },
      manifest: {
        format: String,
        default: options.manifest || '/manifest.json',
      },
      fallback: { format: String, default: options.fallback || '/fallback' },
    },
    assets: {
      base: { format: String, default: options.assetsBase || '/static' },
    },
  });

beforeEach(async (t) => {
  t.context.app = fastify({ logger: false });
});

test('Docs - development mode - /docs index page served', async (t) => {
  t.plan(3);
  const { app } = t.context;
  await app.register(plugin, { podlet: mockPodlet(), config: mockConfig(), extensions: [] });

  const result = await app.inject('/docs');

  t.equal(result.statusCode, 200, '/docs responds with 200 ok');
  t.match(result.payload, '<h1>Documentation</h1>', '/docs responds with correct title');
  t.match(result.payload, '<p>Automatically generated documentation pages for a @podium/podlet-server application.</p>', '/docs responds with correct title sub title');
});

test('Docs - development mode - /docs/configuration page served', async (t) => {
  t.plan(4);
  const { app } = t.context;
  await app.register(plugin, { podlet: mockPodlet(), config: mockConfig(), extensions: [] });

  const result = await app.inject('/docs/configuration');

  t.equal(result.statusCode, 200, '/docs/configuration responds with 200 ok');
  t.match(result.payload, '<h1>Configuration</h1>', '/docs/configuration responds with correct title');
  t.match(result.payload, '<tr><th>development</th><th>base</th></tr>', '/docs/configuration responds with correct table titles');
  t.match(result.payload, '<tr><td>true</td><td>/</td></tr>', '/docs/configuration responds with correct table values');
});

test('Docs - development mode - /docs/routes page served', async (t) => {
  t.plan(4);
  const { app } = t.context;
  await app.register(validationPlugin);
  await app.register(plugin, { podlet: mockPodlet(), config: mockConfig(), extensions: [] });

  const result = await app.inject('/docs/routes');

  t.equal(result.statusCode, 200, '/docs/routes responds with 200 ok');
  t.match(result.payload, '<h1>Routes</h1>', '/docs/routes responds with correct title');
  t.match(result.payload, '<h2>Manifest <a href="/manifest.json">/manifest.json</a></h2>', '/docs/routes responds with correct manifest route link');
  t.match(result.payload, '<h2>Content <a href="/">/</a></h2>', '/docs/routes responds with correct content route link');
});

test('Docs - development mode - /docs/extensions page served', async (t) => {
  t.plan(2);
  const { app } = t.context;
  await app.register(plugin, { podlet: mockPodlet(), config: mockConfig(), extensions: { extensions: new Map() } });

  const result = await app.inject('/docs/extensions');

  t.equal(result.statusCode, 200, '/docs/extensions responds with 200 ok');
  t.match(result.payload, '<h1>Extensions</h1>', '/docs/extensions responds with correct title');
});
