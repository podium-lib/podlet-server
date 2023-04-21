import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname, isAbsolute } from "node:path";
import esbuild from "esbuild";
import resolve from "../lib/resolve.js";
import rollupPluginTerser from "@rollup/plugin-terser";
import { rollup } from "rollup";
import rollupPluginResolve from "@rollup/plugin-node-resolve";
import rollupPluginCommonjs from "@rollup/plugin-commonjs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

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
    const ESBUILD_OUTDIR = join(OUTDIR, ".build");
    const SCRIPTS_FILEPATH = await resolve(join(cwd, "scripts.js"));
    const LAZY_FILEPATH = await resolve(join(cwd, "lazy.js"));

    const entryPoints = [];
    if (existsSync(CONTENT_FILEPATH)) {
      // write entrypoint file to /dist/.build/content.js
      mkdirSync(dirname(CONTENT_ENTRYPOINT), { recursive: true });
      writeFileSync(
        CONTENT_ENTRYPOINT,
        `import "@lit-labs/ssr-client/lit-element-hydrate-support.js";import Component from "${CONTENT_FILEPATH}";customElements.define("${NAME}-content",Component);`
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
        `import "@lit-labs/ssr-client/lit-element-hydrate-support.js";import Component from "${FALLBACK_FILEPATH}";customElements.define("${NAME}-fallback",Component);`
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

    // build dsd ponyfill
    await esbuild.build({
      entryPoints: [require.resolve("@webcomponents/template-shadowroot/template-shadowroot.js")],
      bundle: true,
      format: "esm",
      outfile: join(CLIENT_OUTDIR, "template-shadowroot.js"),
      minify: true,
      target: ["es2017"],
      legalComments: `none`,
      sourcemap: false,
    });

    // Run code through esbuild first (to apply plugins and strip types) but don't bundle or minify
    // use esbuild to resolve imports and then run a build with plugins
    await esbuild.build({
      plugins: [
        {
          name: "esbuild-apply-plugins",
          setup(build) {
            build.onResolve({ filter: /(content|fallback|lazy|scripts|src).*.(ts|js)$/ }, async (args) => {
              if (args.namespace !== "file") return;

              let file = args.path;
              if (!isAbsolute(args.path)) {
                file = join(args.resolveDir, args.path);
              }

              const outfile = file.replace(cwd, ESBUILD_OUTDIR).replace(".ts", ".js");
              await esbuild.build({
                entryPoints: [file],
                plugins,
                sourcemap: false,
                minify: false,
                bundle: false,
                outfile,
              });

              return null;
            });
          },
        },
      ],
      entryPoints,
      bundle: true,
      write: false,
      outdir: ESBUILD_OUTDIR,
    });

    // Run output of esbuild through rollup to take advantage of treeshaking etc.
    async function buildRollupConfig(options) {
      const rollupConfig = [];
      for (const filepath of options) {
        const input = filepath.replace(cwd, ESBUILD_OUTDIR).replace(".ts", ".js");
        const outputFile = input.replace(ESBUILD_OUTDIR, CLIENT_OUTDIR).replace(".ts", ".js");
        rollupConfig.push({
          inlineDynamicImports: true,
          input,
          output: {
            file: outputFile,
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
