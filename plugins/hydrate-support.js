import fp from 'fastify-plugin';
import { joinURLPathSegments } from '../lib/utils.js';

export default fp(async (fastify, { enabled, development, prefix }) => {
  // Only add in development mode since this will be bundled into content and fallback bundles in production.
  if (enabled && development) {
    fastify.log.debug('Lit hydrate support enabled');
    const url = joinURLPathSegments(
      prefix,
      '/_/dynamic/modules/@lit-labs/ssr-client/lit-element-hydrate-support.js',
    );

    // Add Lit hydrate support to the document head via "beforeInteractive" strategy.
    // @ts-ignore
    fastify.scriptsList.push({
      value: url,
      type: 'module',
      strategy: 'beforeInteractive',
    });
  }
});
