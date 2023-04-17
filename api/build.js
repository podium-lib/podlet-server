import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { join, dirname, parse } from "node:path";
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
 * @param {import("../lib/state").State} options.state - App state object
 * @param {import("convict").Config} options.config - The podlet configuration.
 * @param {string} [options.cwd=process.cwd()] - The current working directory.
 * @returns {Promise<void>}
 */
export async function build({ state, config, cwd = process.cwd() }) {
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

    const plugins = await state.build();
    const hash = `${Date.now()}`;
    // Run code through esbuild first to apply plugins but don't bundle or minify
    await esbuild.build({
      entryNames: `[name].${hash}`,
      plugins,
      entryPoints,
      bundle: false,
      format: "esm",
      outdir: cwd,
      minify: false,
    });

    // Run output of esbuild through rollup to take advantage of treeshaking etc.
    async function buildRollupConfig(options) {
      const rollupConfig = [];
      for (const filepath of options) {
        const file = parse(filepath);
        rollupConfig.push({
          inlineDynamicImports: true,
          input: `${cwd}/${file.name}.${hash}.js`,
          output: {
            file: `${CLIENT_OUTDIR}/${file.base}`,
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

    for (const entrypoint of entryPoints) {
      // unlink file
      const file = parse(entrypoint);
      const filepath = `${cwd}/${file.name}.${hash}.js`;
      if (existsSync(filepath)) {
        await unlink(filepath);
      }
    }
  } catch (error) {
    console.error("An error occurred during the build process:", error);
  }
}
