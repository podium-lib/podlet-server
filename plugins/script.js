import fp from 'fastify-plugin';

export default fp(
  /**
   * @param {import('fastify').FastifyInstance} fastify
   * @param {object} options
   * @param {boolean} [options.development]
   */
  async (fastify, { development = false }) => {
    fastify.decorate(
      'script',
      /**
       * @param {string} url
       * @param {{ dev?: boolean, lazy?: boolean }} options – dev: only in development, lazy: dynamic import on load event
       */
      (url, { dev = false, lazy = false } = {}) => {
        if (!development && dev) return '';
        if (lazy) {
          return `<script type="module">addEventListener('load',()=>import('${url}'))</script>`;
        }
        return `<script type="module" src="${url}"></script>`;
      },
    );
  },
);
