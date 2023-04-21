import { html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { render } from "@lit-labs/ssr";
import fp from "fastify-plugin";

export default fp(async function ssrPlugin(fastify, { appName = "", base = "/" }) {
  fastify.decorate("ssr", function ssr(type, template) {
    // user provided markup, SSR'd
    const ssrMarkup = Array.from(render(html`${unsafeHTML(template)}`)).join("");
    // polyfill for browsers that don't support declarative shadow dom
    const polyfillMarkup = `
    <script type="module">
    if (!HTMLTemplateElement.prototype.hasOwnProperty("shadowRoot")) {
      const {hydrateShadowRoots} = await import("${base}/client/template-shadowroot.js");
      hydrateShadowRoots(document.querySelector("${appName}-${type}"));
    }
    </script>`;
    return `${ssrMarkup}${polyfillMarkup}`;
  });
});
