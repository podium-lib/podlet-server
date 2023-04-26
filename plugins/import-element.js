import { join, parse } from "node:path";
import { createRequire } from "node:module";
import esbuild from "esbuild";
import fp from "fastify-plugin";
import { stat } from "node:fs/promises";

const require = createRequire(import.meta.url);

/**
 * Replace the CustomElementRegistry shim used by lit server side with one that allows us to update
 * component definitions in dev without errors being thrown. In prod, we keep the definition check.
 */
class CustomElementRegistry {
  constructor(development = false) {
    this.__definitions = new Map();
    this.development = development;
  }
  define(name, ctor) {
    // we turn off this check for development mode to allow us to replace existing definitions each time
    // a file changes on disk.
    if (!this.development && this.__definitions.has(name)) {
      throw new Error(
        `Failed to execute 'define' on 'CustomElementRegistry': ` +
          `the name "${name}" has already been used with this registry`
      );
    }
    this.__definitions.set(name, { ctor, observedAttributes: ctor.observedAttributes ?? [] });
  }
  get(name) {
    const definition = this.__definitions.get(name);
    return definition?.ctor;
  }
}

export default fp(async function importElement(
  fastify,
  { appName = "", development = false, plugins = [], cwd = process.cwd() }
) {
  // ensure custom elements registry has been enabled
  await import("@lit-labs/ssr");
  const outdir = join(cwd, "dist", "server");

  // replace customElement shim with our own creation that allows for redefines when in development mode.
  // @ts-ignore
  customElements = new CustomElementRegistry(development);

  /**
   * Imports a custom element by pathname, bundles it and registers it in the server side custom element
   * registry.
   * In production mode, this happens 1x for each unique filepath after which this function will noop
   * In development mode, every call to this function will yield a fresh version of the custom element being re-registered
   * to the custom element registry.
   */
  fastify.decorate("importElement", async (path = "") => {
    const { name } = parse(path);

    if (!name || name === ".") {
      throw new Error(
        `Invalid path '${path}' given to importElement. path must be a path (relative or absolute) to a file including filename and extension.`
      );
    }

    const outfile = join(outdir, `${name}.js`);

    // if in production mode and the component has already been defined,
    // no more work is needed, so we bail early
    if (!development && customElements.get(`${appName}-${name}`)) {
      return;
    }

    let filepath = "";
    try {
      filepath = require.resolve(path, { paths: [cwd] });
    } catch (err) {
      fastify.log.error(err);
      // throw in production
      if (!development) throw err;
    }

    // bundle up SSR version of component. I wish this wasn't necessary but all experimentation so far
    // has led me to the conclusion that we need to bundle an SSR to avoid lit complaining about client/server hydration mismatches
    let exists = false;
    try {
      await stat(outfile);
      exists = true;
    } catch(err) {
      // noop
    }
    if (development || !exists) {
      try {
        await esbuild.build({
          entryPoints: [filepath],
          bundle: true,
          format: "esm",
          outfile,
          minify: !development,
          plugins,
          legalComments: `none`,
          sourcemap: development ? "inline" : false,
          external: ["lit"],
        });
      } catch (err) {
        fastify.log.error(err);
      }
    }

    // import fresh copy of the custom element using date string to break module cache
    // in development, this makes it possible for the dev to keep making changes to the file and on
    // subsequent calls to importComponent, the newest version will be imported.
    let Element;
    try {
      Element = (await import(`${outfile}?s=${Date.now()}`)).default;
    } catch (err) {
      fastify.log.error(err);
      if (!development) throw err;
    }

    // define newly imported custom element in the registry
    try {
      customElements.define(`${appName}-${name}`, Element);
    } catch (err) {
      fastify.log.error(err);
      if (!development) throw err;
    }
  });
});
