import fp from 'fastify-plugin';
import { joinURLPathSegments } from '../lib/utils.js';

export default fp(async (fastify, { enabled, base, development, prefix }) => {
  // inject live reload when in dev mode
  if (enabled) {
    fastify.log.debug('Lit hydrate support enabled');

    const url = development
      ? joinURLPathSegments(
          prefix,
          '/_/dynamic/modules/@lit-labs/ssr-client/lit-element-hydrate-support.js',
        )
      : joinURLPathSegments(base, `/client/lit-element-hydrate-support.js`);

    // @ts-ignore
    fastify.scriptsList.push({ value: url, type: 'module' });
  }
});
