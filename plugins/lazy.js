import fp from 'fastify-plugin';
import { joinURLPathSegments } from '../lib/utils.js';

export default fp(
  /**
   * @param {import('fastify').FastifyInstance} fastify
   * @param {object} options
   * @param {boolean} [options.enabled]
   * @param {string} [options.prefix]
   * @param {string} [options.base]
   * @param {boolean} [options.development]
   */
  async (fastify, { enabled, prefix = '/', base, development = false }) => {
    // @ts-ignore
    if (!fastify.scriptsList) fastify.decorate('scriptsList', []);

    // inject live reload when in dev mode
    if (enabled) {
      const url = development
        ? joinURLPathSegments(prefix, `/_/dynamic/files/lazy.js`)
        : joinURLPathSegments(base, `/client/lazy.js`);

      // @ts-ignore
      fastify.scriptsList.push({
        value: url,
        type: 'module',
        strategy: 'lazy',
      });
    }
  },
);
