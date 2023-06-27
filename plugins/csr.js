import fp from "fastify-plugin";

function buildUrlPath(path) {
  return path.replaceAll(/\/+/g, "/");
}

export default fp(async function csrPlugin(fastify, { appName = "", base = "/", development = false, prefix = "" }) {
  fastify.decorate("csr", function csr(name, template) {
    const elementPath = buildUrlPath(`${prefix}/_/dynamic/files/${name}.js`);
    if (development) {
      return `
        ${template}
        <script type="module">
          import El from '${elementPath}';
          customElements.define("${appName}-${name}",El);
        </script>
      `;
    }

    // in production, all scripts are bundled into a single file
    return `${template}<script type="module" src="${base}/client/${name}.js"></script>`;
  });
});
