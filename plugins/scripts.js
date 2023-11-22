import fp from 'fastify-plugin';
import { joinURLPathSegments } from '../lib/utils.js';

export default fp(async (fastify, { enabled, base, development, prefix }) => {
  // inject live reload when in dev mode
  if (enabled) {
    fastify.log.debug('custom client side scripting enabled');

    const url = development
      ? joinURLPathSegments(prefix, `/_/dynamic/files/scripts.js`)
      : joinURLPathSegments(base, `/client/scripts.js`);

    // @ts-ignore
    fastify.scriptsList.push({ value: url, type: 'module', strategy: 'afterInteractive' });
  }
});
