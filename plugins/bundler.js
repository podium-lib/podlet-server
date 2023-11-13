import { join } from 'node:path';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import esbuild from 'esbuild';
import etag from '@fastify/etag';
import fp from 'fastify-plugin';
import httpError from 'http-errors';

const require = createRequire(import.meta.url);

const build = async ({ entryPoints = [], plugins = [] } = {}) => {
  const result = await esbuild.build({
    resolveExtensions: ['.js', '.ts'],
    legalComments: 'none',
    entryPoints,
    charset: 'utf8',
    plugins,
    target: 'esnext',
    bundle: true,
    format: 'esm',
    outdir: `${tmpdir()}/podlet-name`,
    minify: true,
    write: false,
    sourcemap: 'inline',
  });

  return result.outputFiles[0].text;
};

/**
 * @typedef {import("fastify").FastifyRequest<{Params: { "*": string }}>} Request
 */

export default fp(
  async (fastify, { cwd = process.cwd(), development = false, plugins }) => {
    if (!development) return;

    await fastify.register(etag, { algorithm: 'fnv1a' });

    fastify.get(
      '/_/dynamic/modules/*',
      async (/** @type {Request} */ request, reply) => {
        const depname = request.params['*'];

        try {
          const filepath = require.resolve(depname, {
            paths: [cwd, new URL('../', import.meta.url).pathname],
          });
          const body = await build({ entryPoints: [filepath], plugins });

          reply.type('application/javascript');
          reply.send(body);
          return reply;
        } catch (err) {
          fastify.log.debug(
            `Serving 404 - Not Found - Unable to resolve file path for ${depname}.`,
          );
          throw new httpError.NotFound();
        }
      },
    );

    // TODO: add a lazy load wrapper endpoint that wraps the requested file in
    // addEventListener('load',()=>import('${url}'))
    // fastify.get(
    // '/_/dynamic/files/lazyload/:file.js',

    // TODO: add a custom element endpoint that takes the path to a custom element and wraps it in a definiton
    fastify.get(
      '/_/dynamic/element/:type/:name',
      async (/** @type {Request} */ request, reply) => {
        // @ts-ignore
        const { type, name } = request.params;

        reply.type('application/javascript').send(`
          import El from '/_/dynamic/files/${type}.js';
          customElements.define("${name}-${type}",El);
        `);
        return reply;
      },
    );

    fastify.get(
      '/_/dynamic/files/:file.js',
      async (/** @type {Request} */ request, reply) => {
        // @ts-ignore
        const filename = request.params.file;

        try {
          const body = await build({
            entryPoints: [join(cwd, filename)],
            plugins,
          });
          reply.type('application/javascript');
          reply.send(body);
          return reply;
        } catch (err) {
          fastify.log.debug(
            `Serving 404 - Not Found - Unable to resolve file path for ${filename}.`,
          );
          throw new httpError.NotFound();
        }
      },
    );
  },
);
