import { render } from '@lit-labs/ssr';
import fp from 'fastify-plugin';
import { joinURLPathSegments } from '../lib/utils.js';

/**
 * The purpose of this plugin is to decorate the fastify object with mode based method that can be used to
 * server render, client side render or server render and hydrate a template
 */
export default fp(
  async (
    fastify,
    { appName = '', base = '/', prefix = '', development = false, mode },
  ) => {
    // if mode is hydrate or csr-only then we need to include client side scripts for content and fallback
    if (mode !== "ssr-only") {
      // @ts-ignore
      fastify.scriptsList.push({
        value: development
        // in development, we fetch from the development on the fly bundler endpoint
        ? joinURLPathSegments(prefix, `/_/dynamic/files/content.js`)
        // where as in production, we use the production build
        : joinURLPathSegments(base, `/client/content.js`),
        // add scope hint so the podlet or layout will only use this script for successful content requests
        scope: "content",
        type: "module",
        // using this strategy hints to the document template that the script will be added to the page later than any beforeInteractive scripts
        // hydration support is added in the beforeInteractive phase
        strategy: "afterInteractive"
      });
      // @ts-ignore
      fastify.scriptsList.push({
        value: development
          ? joinURLPathSegments(prefix, `/_/dynamic/files/fallback.js`)
          : joinURLPathSegments(base, `/client/fallback.js`),
        scope: 'fallback',
        type: 'module',
        strategy: 'afterInteractive',
      });
    }


    /**
     * Renders a template for a given type (content or fallback)
     * Takes into account development mode vs production and assets base and appName
     * Scopes the polyfill to the element in question to avoid clashing with other uses of hydration
     * on the page
     * @param {"content" | "fallback"} type
     * @param {import("lit").HTMLTemplateResult} template
     * @returns {string} - server rendered component markup with dsd polyfill inlined after
     *
     * @example
     * ```js
     * serverRender("content", html`<my-app-content ...etc></my-app-content>`)
     * ```
     */
    function serverRender(type, template) {
      let shadowRootPath = `${base}/client/template-shadowroot.js`;
      if (development) {
        shadowRootPath = joinURLPathSegments(
          prefix,
          `/_/dynamic/modules/@webcomponents/template-shadowroot/template-shadowroot.js`,
        );
      }
      // user provided markup, SSR'd
      const ssrMarkup = Array.from(render(template)).join('');
      // polyfill for browsers that don't support declarative shadow dom
      const polyfillMarkup = `
        <script type="module">
        if (!HTMLTemplateElement.prototype.hasOwnProperty("shadowRoot")) {
          const {hydrateShadowRoots} = await import("${shadowRootPath}");
          hydrateShadowRoots(document.querySelector("${appName}-${type}"));
        }
        </script>`;
      return `${ssrMarkup}${polyfillMarkup}`;
    }

    /**
     * Mode decorators for ssr-only, csr-only and hydrate
     */

    fastify.decorate(
      'serverRender',
      /**
       * Fastify decorator method that creates server side only markup from a type (content or fallback)
       * and a template
       * @param {"content" | "fallback"} type
       * @param {import("lit").HTMLTemplateResult} template
       * @returns {string}
       */
      (type, template) => {
        return `${serverRender(type, template)}`;
      },
    );

    fastify.decorate(
      'clientRender',
      /**
       * Fastify decorator method that creates server side tag markup for a content or fallback route and adds additional client side scripts to define the component
       * once the page has loaded
       * @param {"content" | "fallback"} type
       * @param {import("lit").HTMLTemplateResult} template
       * @returns {string}
       */
      // @ts-ignore
      (type, template) => {
        return `${String.raw(template.strings, ...template.values)}`.replace('null', '');
      },
    );
  },
);

// Also TODO
// hydrate polyfill is loaded on dom ready but should really happen inline if possible to avoid FOUC in Safari and FF
