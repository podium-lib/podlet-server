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
    /**
     * Constructs a script tag for a given type (content or fallback)
     * Takes into account development mode vs production, app mode (ssr-only, csr-only or hydrate) and assets base
     * @param {"content" | "fallback"} type
     * @returns {string} - constructed script tag
     */
    function scriptTag(type) {
      let script;
      if (mode !== 'ssr-only') {
        if (development) {
          script = `<script src="/_/dynamic/element/${type}/${appName}" type="module" crossorigin defer></script>`;
        } else {
          script = `<script src="${base}/client/${type}.js" type="module" crossorigin defer></script>`;
        }
      }
      return script;
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
      'serverRenderAndHydrate',
      /**
       * Fastify decorator method that creates server side only markup with additional client side hydration scripts using a type (content or fallback)
       * and a template
       * @param {"content" | "fallback"} type
       * @param {import("lit").HTMLTemplateResult} template
       * @returns {string}
       */
      (type, template) => {
        return `${serverRender(type, template)}${scriptTag(type)}`;
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
      (type, template) => {
        return `${String.raw(template.strings, ...template.values)}${scriptTag(
          type,
        )}`.replace('null', '');
      },
    );
  },
);

// Also TODO
// hydrate polyfill is loaded on dom ready but should really happen inline if possible to avoid FOUC in Safari and FF
