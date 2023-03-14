import fp from "fastify-plugin";

export default fp(async function scriptPlugin(fastify, { development = false }) {
  fastify.decorate("script", function script(url, { dev = false, lazy = false, } = {}) {
    if (!development && dev) return "";
    if (lazy) {
        return `<script type="module">addEventListener('load',()=>import('${url}'))</script>`;
    }
    return `<script type="module" src="${url}"></script>`;
  });
});
