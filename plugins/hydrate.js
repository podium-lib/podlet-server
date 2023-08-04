import { render as ssr } from '@lit-labs/ssr';
import fp from 'fastify-plugin';
import { joinURLPathSegments } from '../lib/utils.js';

export default fp(
  async (
    fastify,
    { appName = '', base = '/', development = false, prefix = '/' },
  ) => {
    fastify.decorate('hydrate', (type, template) => {
      const elementPath = joinURLPathSegments(
        prefix,
        `/_/dynamic/files/${type}.js`,
      );
      let shadowRootPath = `${base}/client/template-shadowroot.js`;
      if (development) {
        shadowRootPath = joinURLPathSegments(
          prefix,
          `/_/dynamic/modules/@webcomponents/template-shadowroot/template-shadowroot.js`,
        );
      }
      // user provided markup, SSR'd
      const ssrMarkup = Array.from(ssr(template)).join('');
      // polyfill for browsers that don't support declarative shadow dom
      const polyfillMarkup = `
    <script type="module">
    if (!HTMLTemplateElement.prototype.hasOwnProperty("shadowRoot")) {
      const {hydrateShadowRoots} = await import("${shadowRootPath}");
      hydrateShadowRoots(document.querySelector("${appName}-${type}"));
    }
    </script>`;

      if (development) {
        return `
        ${ssrMarkup}
        ${polyfillMarkup}
        <script type="module">
          import El from "${elementPath}";
          customElements.define("${appName}-${type}",El);
        </script>
      `;
      }

      // in production, all scripts are bundled into a single file
      return `${ssrMarkup}${polyfillMarkup}<script type="module" src="${base}/client/${type}.js"></script>`;
    });
  },
);
