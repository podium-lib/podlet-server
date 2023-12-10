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

    /**
     * Special case route.
     * Lit SSR client supports Node and browser environments. When we try to use require.resolve we get the Node version
     * when we want the browser version so we trick it by running a build on file containing only an import statement
     */
    fastify.get(
      '/_/dynamic/modules/@lit-labs/ssr-client/lit-element-hydrate-support.js',
      async (/** @type {Request} */ request, reply) => {
        const filepath = join(new URL("..", import.meta.url).pathname, "lib", "lit-element-hydrate-support.js");

        try {
          const body = await build({ entryPoints: [filepath], plugins });

          reply.type('application/javascript');
          reply.send(body);
          return reply;
        } catch (err) {
          fastify.log.error(err)
          throw new httpError.NotFound();
        }
      },
    );

    /**
     * Endpoint to dynamically bundle and serve Node modules for the frontend when in dev mode
     * This endpoint is not used in production as dependencies will be included in a production build when running "podlet build"
     *
     * "*" is a Node package name including scope. Eg. lit or @lit-labs/ssr
     */
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

    /**
     * Endpoint that wraps content.js or fallback.js definitions in a customElement.define call for use during development.
     * This endpoint is not used in production as content and fallback elements will be included in a production build when running "podlet build".
     *
     * :type is either "content" or "fallback"
     * :name is the application name
     */
    fastify.get(
      '/_/dynamic/element/:type/:name',
      async (/** @type {Request} */ request, reply) => {
        // @ts-ignore
        const { type, name } = request.params;

        reply
          .type('application/javascript')
          .send(
            `import El from '/_/dynamic/files/${type}.js';customElements.define("${name}-${type}",El);`,
          );
        return reply;
      },
    );

    /**
     * Endpoint that accepts the name/path for a core project JavaScript file such as content.js or fallback.js
     * which it then bundles and serves.
     * This endpoint is not used in production as files will be included in a production build when running "podlet build"
     *
     * :file.js is either content.js, fallback.js, lazy.js or scripts.js
     */
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
