import fp from "fastify-plugin";

export default fp(async function csrPlugin(fastify, { appName = "", base = "/", development = false }) {
  fastify.decorate("csr", function csr(name, template) {
    if (development) {
      return `
        ${template}
        <script type="module">
          import El from '${base}/client/${name}.js';
          customElements.define("${appName}-${name}",El);
        </script>
      `;
    }

    // in production, all scripts are bundled into a single file
    return `${template}<script type="module" src="${base}/client/${name}.js"></script>`;
  });
});
