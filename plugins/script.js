import fp from 'fastify-plugin';

export default fp(async (fastify, { development = false }) => {
  fastify.decorate('script', (url, { dev = false, lazy = false } = {}) => {
    if (!development && dev) return '';
    if (lazy) {
      return `<script type="module">addEventListener('load',()=>import('${url}'))</script>`;
    }
    return `<script type="module" src="${url}"></script>`;
  });
});
