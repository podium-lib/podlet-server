import fp from 'fastify-plugin';
import { joinURLPathSegments } from '../lib/utils.js';

export default fp(
  /**
   * @param {import('fastify').FastifyInstance} fastify
   * @param {object} options
   * @param {string} [options.base]
   * @param {string} [options.prefix]
   * @param {boolean} [options.development]
   * @param {boolean} [options.enabled]
   */
  async (fastify, { enabled, base, development, prefix }) => {
    // @ts-ignore
    if (!fastify.scriptsList) fastify.decorate('scriptsList', []);

    // inject live reload when in dev mode
    if (enabled) {
      fastify.log.debug('custom client side scripting enabled');

      const url = development
        ? joinURLPathSegments(prefix, `/_/dynamic/files/scripts.js`)
        : joinURLPathSegments(base, `/client/scripts.js`);

      // @ts-ignore
      fastify.scriptsList.push({
        value: url,
        type: 'module',
        strategy: 'afterInteractive',
      });
    }
  },
);
