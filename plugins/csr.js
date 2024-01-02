import fp from 'fastify-plugin';
import { joinURLPathSegments } from '../lib/utils.js';

export default fp(
  /**
   * @param {import('fastify').FastifyInstance} fastify
   * @param {object} options
   * @param {string} [options.appName]
   * @param {string} [options.base]
   * @param {string} [options.prefix]
   * @param {boolean} [options.development]
   */
  async (
    fastify,
    { appName = '', base = '/', development = false, prefix = '' },
  ) => {
    fastify.decorate('csr', (name, template) => {
      const elementPath = joinURLPathSegments(
        prefix,
        `/_/dynamic/files/${name}.js`,
      );
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
  },
);
