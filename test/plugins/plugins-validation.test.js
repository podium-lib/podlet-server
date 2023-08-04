import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { beforeEach, test } from 'tap';
import fastify from 'fastify';
import plugin from '../../plugins/validation.js';

const tmp = join(tmpdir(), './plugins-validation.test.js');

const defaults = {
  headers: { 'custom-header': { type: 'boolean' } },
  querystring: {},
  params: {},
};

beforeEach(async (t) => {
  await mkdir(tmp);
  await writeFile(
    join(tmp, 'package.json'),
    JSON.stringify({ name: 'test-podlet' }),
  );
  await mkdir(join(tmp, 'schemas'));
  t.context.app = fastify({ logger: false });
});

test('default schema values added to route', async (t) => {
  const { app } = t.context;
  await app.register(plugin, { cwd: tmp, defaults });

  app.addHook('onRoute', (routeOptions) => {
    if (routeOptions.method !== 'GET') return;
    t.equal(
      routeOptions.schema.headers['custom-header'].type,
      'boolean',
      'custom-header should be set and be the default',
    );
    t.end();
  });

  // register a route to trigger route hooks
  app.get('/content', () => {});

  await app.listen({ port: 0 });
  await app.close();
  await rm(tmp, { recursive: true, force: true });
});

test('custom schema values override defaults when present', async (t) => {
  const { app } = t.context;

  await writeFile(
    join(tmp, 'schemas', 'route.json'),
    JSON.stringify({
      headers: {
        'custom-header': { type: 'string' },
      },
    }),
  );

  await app.register(plugin, { cwd: tmp, defaults });

  app.addHook('onRoute', (routeOptions) => {
    if (routeOptions.method !== 'GET') return;
    t.equal(
      routeOptions.schema.headers['custom-header'].type,
      'string',
      'custom-header should be set and be the overridden',
    );
    t.end();
  });

  // register a route to trigger route hooks
  app.get('/route', () => {});

  await app.listen({ port: 0 });
  await app.close();
  await rm(tmp, { recursive: true, force: true });
});

test('custom schema values override defaults when present and plugin is mounted under a prefix path', async (t) => {
  const { app } = t.context;

  await writeFile(
    join(tmp, 'schemas', 'route.json'),
    JSON.stringify({
      headers: {
        'custom-header': { type: 'string' },
      },
    }),
  );

  await app.register(plugin, { prefix: '/custom-prefix', cwd: tmp, defaults });

  app.addHook('onRoute', (routeOptions) => {
    if (routeOptions.method !== 'GET') return;
    t.equal(
      routeOptions.schema.headers['custom-header'].type,
      'string',
      'custom-header should be set and be overridden',
    );
    t.end();
  });

  // register a route to trigger route hooks
  app.get('/route', () => {});

  await app.listen({ port: 0 });
  await app.close();
  await rm(tmp, { recursive: true, force: true });
});

test('custom schema values override defaults when present and plugin is mounted under a prefix path at root route', async (t) => {
  const { app } = t.context;

  await writeFile(
    join(tmp, 'schemas', 'route.json'),
    JSON.stringify({
      headers: {
        'custom-header': { type: 'string' },
      },
    }),
  );

  await app.register(plugin, { prefix: '/custom-prefix', cwd: tmp, defaults });

  app.addHook('onRoute', (routeOptions) => {
    if (routeOptions.method !== 'GET') return;
    t.equal(
      routeOptions.schema.headers['custom-header'].type,
      'boolean',
      'custom-header should be set and not be overridden',
    );
    t.end();
  });

  // register a route to trigger route hooks
  app.get('/', () => {});

  await app.listen({ port: 0 });
  await app.close();
  await rm(tmp, { recursive: true, force: true });
});

test('root path handled via mappings plugin option', async (t) => {
  const { app } = t.context;

  await writeFile(
    join(tmp, 'schemas', 'route.json'),
    JSON.stringify({
      headers: {
        'custom-header': { type: 'string' },
      },
    }),
  );

  await app.register(plugin, {
    cwd: tmp,
    defaults,
    mappings: { '/': 'route.json' },
  });

  app.addHook('onRoute', (routeOptions) => {
    if (routeOptions.method !== 'GET') return;
    t.equal(
      routeOptions.schema.headers['custom-header'].type,
      'string',
      'custom-header should be set and be overridden',
    );
    t.end();
  });

  // register a route to trigger route hooks
  app.get('/', () => {});

  await app.listen({ port: 0 });
  await app.close();
  await rm(tmp, { recursive: true, force: true });
});

test('prefix given and root path handled via mappings plugin option', async (t) => {
  const { app } = t.context;

  await writeFile(
    join(tmp, 'schemas', 'route.json'),
    JSON.stringify({
      headers: {
        'custom-header': { type: 'string' },
      },
    }),
  );

  await app.register(plugin, {
    prefix: '/my-test',
    cwd: tmp,
    defaults,
    mappings: { '/': 'route.json' },
  });

  app.addHook('onRoute', (routeOptions) => {
    if (routeOptions.method !== 'GET') return;
    t.equal(
      routeOptions.schema.headers['custom-header'].type,
      'string',
      'custom-header should be set and be overridden',
    );
    t.end();
  });

  // register a route to trigger route hooks
  app.get('/', () => {});

  await app.listen({ port: 0 });
  await app.close();
  await rm(tmp, { recursive: true, force: true });
});

test('prefix given and non root path handled via mappings plugin option', async (t) => {
  const { app } = t.context;

  await writeFile(
    join(tmp, 'schemas', 'route.json'),
    JSON.stringify({
      headers: {
        'custom-header': { type: 'string' },
      },
    }),
  );

  await app.register(plugin, {
    prefix: '/my-test',
    cwd: tmp,
    defaults,
    mappings: { '/test': 'route.json' },
  });

  app.addHook('onRoute', (routeOptions) => {
    if (routeOptions.method !== 'GET') return;
    t.equal(
      routeOptions.schema.headers['custom-header'].type,
      'string',
      'custom-header should be set and be overridden',
    );
    t.end();
  });

  // register a route to trigger route hooks
  app.get('/test', () => {});

  await app.listen({ port: 0 });
  await app.close();
  await rm(tmp, { recursive: true, force: true });
});

test('when no validation schema is available, values are stripped', async (t) => {
  const { app } = t.context;
  await app.register(plugin, { cwd: tmp });
  app.get('/route', (req) => {
    t.ok(!req.query.count);
    t.end();
  });
  const address = await app.listen({ port: 0 });
  await fetch(`${address}?count=1`);
  await app.close();
  await rm(tmp, { recursive: true, force: true });
});

test("when validation schema is available and values don't validate, validation throws.", async (t) => {
  const { app } = t.context;
  await app.register(plugin, {
    cwd: tmp,
    defaults: { querystring: { count: { type: 'integer' } } },
  });
  app.get('/route', () => {});
  app.setErrorHandler(async (err, req, reply) => {
    reply.send({ status: 400, error: err.message });
  });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/route?count=invalid`);
  const res = await result.json();
  t.equal(
    res.error,
    'querystring/count must be integer',
    'server should respond with a querystring error',
  );
  await app.close();
  await rm(tmp, { recursive: true, force: true });
  t.end();
});
