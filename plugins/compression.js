import compress from '@fastify/compress';
import fp from 'fastify-plugin';

export default fp(
  /**
   * @param {import('fastify').FastifyInstance} fastify
   * @param {object} options
   * @param {boolean} [options.enabled]
   */
  async (fastify, { enabled }) => {
    if (enabled) {
      await fastify.register(compress, { global: true });
    }
  },
);
