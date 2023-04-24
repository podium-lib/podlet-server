import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname, isAbsolute } from "node:path";
import esbuild from "esbuild";
import resolve from "../lib/resolve.js";
import rollupPluginTerser from "@rollup/plugin-terser";
import { rollup } from "rollup";
import rollupPluginResolve from "@rollup/plugin-node-resolve";
import rollupPluginCommonjs from "@rollup/plugin-commonjs";
import { createRequire } from "node:module";
import { getLinguiConfig, linguiCompile } from "../lib/lingui.js";

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
    const SERVER_OUTDIR = join(OUTDIR, "server");
    const ESBUILD_OUTDIR = join(OUTDIR, ".build");

    mkdirSync(CLIENT_OUTDIR, { recursive: true });
    mkdirSync(SERVER_OUTDIR, { recursive: true });
    mkdirSync(ESBUILD_OUTDIR, { recursive: true });

    const CONTENT_SRC_FILEPATH = await resolve(join(cwd, "content.js"));
    const CONTENT_ENTRY = join(ESBUILD_OUTDIR, "content-entrypoint.js");
    const CONTENT_INTERMEDIATE = join(ESBUILD_OUTDIR, "content.js");
    const CONTENT_FINAL = join(CLIENT_OUTDIR, "content.js");

    const FALLBACK_SRC_FILEPATH = await resolve(join(cwd, "fallback.js"));
    const FALLBACK_ENTRY = join(ESBUILD_OUTDIR, "fallback-entrypoint.js");
    const FALLBACK_INTERMEDIATE = join(ESBUILD_OUTDIR, "fallback.js");
    const FALLBACK_FINAL = join(CLIENT_OUTDIR, "fallback.js");

    const SCRIPTS_ENTRY = await resolve(join(cwd, "scripts.js"));
    const SCRIPTS_INTERMEDIATE = join(ESBUILD_OUTDIR, "scripts.js");
    const SCRIPTS_FINAL = join(CLIENT_OUTDIR, "scripts.js");

    const LAZY_ENTRY = await resolve(join(cwd, "lazy.js"));
    const LAZY_INTERMEDIATE = join(ESBUILD_OUTDIR, "lazy.js");
    const LAZY_FINAL = join(CLIENT_OUTDIR, "lazy.js");

    // Create entrypoints for each file type
    if (existsSync(CONTENT_SRC_FILEPATH)) {
      writeFileSync(
        CONTENT_ENTRY,
        `import "${require.resolve(
          "@lit-labs/ssr-client/lit-element-hydrate-support.js"
        )}";import Component from "${CONTENT_SRC_FILEPATH}";customElements.define("${NAME}-content",Component);`
      );
    }
    if (existsSync(FALLBACK_SRC_FILEPATH)) {
      writeFileSync(
        FALLBACK_ENTRY,
        `import "${require.resolve(
          "@lit-labs/ssr-client/lit-element-hydrate-support.js"
        )}";import Component from "${FALLBACK_SRC_FILEPATH}";customElements.define("${NAME}-fallback",Component);`
      );
    }

    // detect entrypoints for each file type
    // compile all messages before building
    const linguiConfig = getLinguiConfig({ config, cwd });
    await linguiCompile({ linguiConfig, config });

    const entryPoints = [];
    if (existsSync(CONTENT_ENTRY)) {
      if (MODE !== "ssr-only") {
        entryPoints.push(CONTENT_ENTRY);
      }
    }
    if (existsSync(FALLBACK_ENTRY)) {
      if (MODE !== "ssr-only") {
        entryPoints.push(FALLBACK_ENTRY);
      }
    }
    if (existsSync(SCRIPTS_ENTRY)) {
      entryPoints.push(SCRIPTS_ENTRY);
    }
    if (existsSync(LAZY_ENTRY)) {
      entryPoints.push(LAZY_ENTRY);
    }

    const plugins = await state.build();

    // build server side files
    try {
      await esbuild.build({
        entryPoints: [
          existsSync(CONTENT_SRC_FILEPATH) ? CONTENT_SRC_FILEPATH : null,
          existsSync(FALLBACK_SRC_FILEPATH) ? FALLBACK_SRC_FILEPATH : null,
        ].filter(Boolean),
        bundle: true,
        format: "esm",
        outdir: SERVER_OUTDIR,
        minify: true,
        plugins,
        legalComments: `none`,
        sourcemap: false,
        external: ["lit"],
      });
    } catch (err) {}

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
              if (args.path.includes("node_modules")) return;

              let file = args.path;
              if (!isAbsolute(args.path)) {
                file = join(args.resolveDir, args.path);
              }

              let outfile;
              if (file === CONTENT_ENTRY) {
                outfile = CONTENT_INTERMEDIATE;
              } else if (file === FALLBACK_ENTRY) {
                outfile = FALLBACK_INTERMEDIATE;
              } else if (file === LAZY_ENTRY) {
                outfile = LAZY_INTERMEDIATE;
              } else if (file === SCRIPTS_ENTRY) {
                outfile = SCRIPTS_INTERMEDIATE;
              }

              if (!outfile) {
                return null;
              }

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
        const input = filepath.replace("-entrypoint", "");

        let outfile;
        if (filepath === CONTENT_ENTRY) {
          outfile = CONTENT_FINAL;
        } else if (filepath === FALLBACK_ENTRY) {
          outfile = FALLBACK_FINAL;
        } else if (filepath === LAZY_ENTRY) {
          outfile = LAZY_FINAL;
        } else if (filepath === SCRIPTS_ENTRY) {
          outfile = SCRIPTS_FINAL;
        }

        rollupConfig.push({
          inlineDynamicImports: true,
          input,
          output: {
            file: outfile,
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
