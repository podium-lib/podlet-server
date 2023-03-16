import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import esbuild from "esbuild";
import resolve from "../lib/resolve.js";

/**
 * Builds the project using esbuild.
 *
 * @param {Object} options
 * @param {import("convict").Config} options.config - The configuration object.
 * @param {string} [options.cwd=process.cwd()] - The current working directory.
 * @returns {Promise<void>}
 */
export async function build({ config, cwd = process.cwd() }) {
  try {
    const NAME = /** @type {string} */ (/** @type {unknown} */ (config.get("app.name")));
    // https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/61750
    // @ts-ignore
    const MODE = config.get("app.mode");
    const OUTDIR = join(cwd, "dist");
    const CLIENT_OUTDIR = join(OUTDIR, "client");
    const CONTENT_FILEPATH = await resolve(join(cwd, "content.js"));
    const FALLBACK_FILEPATH = await resolve(join(cwd, "fallback.js"));
    const BUILD_FILEPATH = await resolve(join(cwd, "build.js"));
    const CONTENT_ENTRYPOINT = join(OUTDIR, ".build", "content.js");
    const FALLBACK_ENTRYPOINT = join(OUTDIR, ".build", "fallback.js");
    const SCRIPTS_FILEPATH = await resolve(join(cwd, "scripts.js"));
    const LAZY_FILEPATH = await resolve(join(cwd, "lazy.js"));

    const entryPoints = [];
    if (existsSync(CONTENT_FILEPATH)) {
      // write entrypoint file to /dist/.build/content.js
      mkdirSync(dirname(CONTENT_ENTRYPOINT), { recursive: true });
      writeFileSync(
        CONTENT_ENTRYPOINT,
        `import "lit/experimental-hydrate-support.js";import Component from "${CONTENT_FILEPATH}";customElements.define("${NAME}-content",Component);`
      );
      if (MODE !== "ssr-only") {
        entryPoints.push(CONTENT_ENTRYPOINT);
      }
    }
    if (existsSync(FALLBACK_FILEPATH)) {
      // write entrypoint file to /dist/.build/content.js
      mkdirSync(dirname(FALLBACK_ENTRYPOINT), { recursive: true });
      writeFileSync(
        FALLBACK_ENTRYPOINT,
        `import "lit/experimental-hydrate-support.js";import Component from "${FALLBACK_FILEPATH}";customElements.define("${NAME}-fallback",Component);`
      );
      if (MODE !== "ssr-only") {
        entryPoints.push(FALLBACK_ENTRYPOINT);
      }
    }
    if (existsSync(SCRIPTS_FILEPATH)) {
      entryPoints.push(SCRIPTS_FILEPATH);
    }
    if (existsSync(LAZY_FILEPATH)) {
      entryPoints.push(LAZY_FILEPATH);
    }

    // support user defined plugins via a build.js file
    const plugins = [];
    if (existsSync(BUILD_FILEPATH)) {
      try {
        const userDefinedBuild = (await import(BUILD_FILEPATH)).default;
        const userDefinedPlugins = await userDefinedBuild({ config });
        if (Array.isArray(userDefinedPlugins)) {
          plugins.unshift(...userDefinedPlugins);
        }
      } catch (err) {
        // noop
      }
    }

    await esbuild.build({
      entryNames: "[name]",
      plugins,
      entryPoints,
      bundle: true,
      format: "esm",
      outdir: CLIENT_OUTDIR,
      minify: true,
      target: ["es2017"],
      legalComments: `none`,
      sourcemap: true,
    });
  } catch (error) {
    console.error("An error occurred during the build process:", error);
  }
}
