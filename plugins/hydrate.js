import { render as ssr } from "@lit-labs/ssr";
import fp from "fastify-plugin";

export default fp(async function hydratePlugin(fastify, { appName = "", base = "/", development = false }) {
  fastify.decorate("hydrate", function hydrate(type, template) {
    // user provided markup, SSR'd
    const ssrMarkup = Array.from(ssr(template)).join("");
    // polyfill for browsers that don't support declarative shadow dom
    const polyfillMarkup = `
    <script type="module">
    if (!HTMLTemplateElement.prototype.hasOwnProperty("shadowRoot")) {
      const {hydrateShadowRoots} = await import("${base}/client/template-shadowroot.js");
      hydrateShadowRoots(document.querySelector("${appName}-${type}"));
    }
    </script>`;

    if (development) {
      return `
        ${ssrMarkup}
        ${polyfillMarkup}
        <script type="module">
          import El from "${base}/client/${type}.js";
          customElements.define("${appName}-${type}",El);
        </script>
      `;
    }

    // in production, all scripts are bundled into a single file
    return `${ssrMarkup}${polyfillMarkup}<script type="module" src="${base}/client/${type}.js"></script>`;
  });
});
