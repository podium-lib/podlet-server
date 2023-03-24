import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import esbuild from "esbuild";
import resolve from "../lib/resolve.js";
import rollupPluginTerser from "@rollup/plugin-terser";
import { rollup } from "rollup";
import rollupPluginResolve from "@rollup/plugin-node-resolve";
import rollupPluginCommonjs from "@rollup/plugin-commonjs";

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
    // https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/61750
    // @ts-ignore
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
    const ESBUILD_OUTDIR = join(OUTDIR, ".build", "esbuild");
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

    // Run code through esbuild first to apply plugins but don't bundle or minify
    await esbuild.build({
      entryNames: "[name]",
      plugins,
      entryPoints,
      bundle: false,
      format: "esm",
      outdir: ESBUILD_OUTDIR,
      minify: false,
    });

    // Run output of esbuild through rollup to take advantage of treeshaking etc.
    async function buildRollupConfig(options) {
      const rollupConfig = [];
      for (const filepath of options) {
        rollupConfig.push({
          inlineDynamicImports: true,
          input: `${ESBUILD_OUTDIR}/${basename(filepath)}`,
          output: {
            file: `${CLIENT_OUTDIR}/${basename(filepath)}`,
            format: "es",
          },
          plugins: [
            rollupPluginResolve(),
            rollupPluginCommonjs({ include: /node_modules/ }),
            rollupPluginTerser({ format: { comments: false } }),
          ],
        });
      }
      return rollupConfig;
    }

    for (const options of await buildRollupConfig(entryPoints)) {
      const bundle = await rollup({
        input: options.input,
        plugins: options.plugins,
      });
      // appease TS being difficult by casting the format string to type ModuleFormat.
      const format = /** @type {import("rollup").ModuleFormat} */ (options.output.format);
      await bundle.write({ ...options.output, format });
    }
  } catch (error) {
    console.error("An error occurred during the build process:", error);
  }
}
