import { readFileSync } from "node:fs";
import { html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { render } from "@lit-labs/ssr";
import fp from "fastify-plugin";

const dsdPolyfill = readFileSync(new URL("../lib/dsd-polyfill.js", import.meta.url), { encoding: "utf8" });

export default fp(async function ssrPlugin(fastify) {
  fastify.decorate("ssr", function ssr(template) {
    // user provided markup, SSR'd
    const ssrMarkup = Array.from(render(html`${unsafeHTML(template)}`)).join("");
    // polyfill for browsers that don't support declarative shadow dom
    const polyfillMarkup = `<script>${dsdPolyfill}</script>`;
    return `${ssrMarkup}${polyfillMarkup}`;
  });
});
