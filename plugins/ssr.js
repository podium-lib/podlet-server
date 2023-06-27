import { render } from "@lit-labs/ssr";
import fp from "fastify-plugin";

function buildUrlPath(path) {
  return path.replaceAll(/\/+/g, "/");
}

export default fp(async function ssrPlugin(fastify, { appName = "", prefix = "" }) {
  fastify.decorate("ssr", function ssr(type, template) {
    const shadowRootPath = buildUrlPath(`${prefix}/_/dynamic/modules/@webcomponents/template-shadowroot/template-shadowroot.js`);
    // user provided markup, SSR'd
    const ssrMarkup = Array.from(render(template)).join("");
    // polyfill for browsers that don't support declarative shadow dom
    const polyfillMarkup = `
    <script type="module">
    if (!HTMLTemplateElement.prototype.hasOwnProperty("shadowRoot")) {
      const {hydrateShadowRoots} = await import("${shadowRootPath}");
      hydrateShadowRoots(document.querySelector("${appName}-${type}"));
    }
    </script>`;
    return `${ssrMarkup}${polyfillMarkup}`;
  });
});
