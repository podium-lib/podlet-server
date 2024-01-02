import {
  existsSync,
  mkdirSync,
  writeFileSync,
  renameSync,
  rename,
} from 'node:fs';
import { join } from 'node:path';
import esbuild from 'esbuild';
import { createRequire } from 'node:module';
import resolve from '../lib/resolve.js';
import { getLinguiConfig, linguiCompile } from '../lib/lingui.js';

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
    const NAME = /** @type {string} */ (
      /** @type {unknown} */ (config.get('app.name'))
    );
    // https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/61750
    // @ts-ignore
    const MODE = config.get('app.mode');
    const OUTDIR = join(cwd, 'dist');
    const CLIENT_OUTDIR = join(OUTDIR, 'client');
    const SERVER_OUTDIR = join(OUTDIR, 'server');
    const ESBUILD_OUTDIR = join(OUTDIR, '.build');

    mkdirSync(CLIENT_OUTDIR, { recursive: true });
    mkdirSync(SERVER_OUTDIR, { recursive: true });
    mkdirSync(ESBUILD_OUTDIR, { recursive: true });

    const CONTENT_SRC_FILEPATH = await resolve(join(cwd, 'content.js'));
    const CONTENT_ENTRY = join(ESBUILD_OUTDIR, 'content-entrypoint.js');
    const CONTENT_INTERMEDIATE = join(CLIENT_OUTDIR, 'content-entrypoint.js');
    const CONTENT_FINAL = join(CLIENT_OUTDIR, 'content.js');

    const FALLBACK_SRC_FILEPATH = await resolve(join(cwd, 'fallback.js'));
    const FALLBACK_ENTRY = join(ESBUILD_OUTDIR, 'fallback-entrypoint.js');
    const FALLBACK_INTERMEDIATE = join(CLIENT_OUTDIR, 'fallback-entrypoint.js');
    const FALLBACK_FINAL = join(CLIENT_OUTDIR, 'fallback.js');

    const SCRIPTS_ENTRY = await resolve(join(cwd, 'scripts.js'));

    const LAZY_ENTRY = await resolve(join(cwd, 'lazy.js'));

    const hydrateSupport =
      MODE === 'hydrate'
        ? 'import "@lit-labs/ssr-client/lit-element-hydrate-support.js";'
        : '';

    // Create entrypoints for each file type
    if (existsSync(CONTENT_SRC_FILEPATH)) {
      writeFileSync(
        CONTENT_ENTRY,
        `${hydrateSupport}import Component from "${CONTENT_SRC_FILEPATH}";customElements.define("${NAME}-content",Component);`,
      );
    }
    if (existsSync(FALLBACK_SRC_FILEPATH)) {
      writeFileSync(
        FALLBACK_ENTRY,
        `${hydrateSupport}import Component from "${FALLBACK_SRC_FILEPATH}";customElements.define("${NAME}-fallback",Component);`,
      );
    }

    // detect entrypoints for each file type
    // compile all messages before building
    const linguiConfig = await getLinguiConfig({ config, cwd });
    // @ts-ignore
    await linguiCompile({ linguiConfig, config });

    const entryPoints = [];
    if (existsSync(CONTENT_ENTRY)) {
      if (MODE !== 'ssr-only') {
        entryPoints.push(CONTENT_ENTRY);
      }
    }
    if (existsSync(FALLBACK_ENTRY)) {
      if (MODE !== 'ssr-only') {
        entryPoints.push(FALLBACK_ENTRY);
      }
    }
    if (existsSync(SCRIPTS_ENTRY)) {
      entryPoints.push(SCRIPTS_ENTRY);
    }
    if (existsSync(LAZY_ENTRY)) {
      entryPoints.push(LAZY_ENTRY);
    }

    // build server side files
    const serverPlugins = await state.build(config, { isServer: true });
    try {
      await esbuild.build({
        entryPoints: [
          existsSync(CONTENT_SRC_FILEPATH) ? CONTENT_SRC_FILEPATH : null,
          existsSync(FALLBACK_SRC_FILEPATH) ? FALLBACK_SRC_FILEPATH : null,
        ].filter(Boolean),
        bundle: true,
        format: 'esm',
        outdir: SERVER_OUTDIR,
        minify: true,
        plugins: serverPlugins,
        legalComments: `none`,
        sourcemap: false,
        external: ['lit'],
      });
    } catch (err) {
      // eslint
    }

    const clientPlugins = await state.build(config, { isClient: true });

    // build dsd ponyfill
    await esbuild.build({
      entryPoints: [
        require.resolve(
          '@webcomponents/template-shadowroot/template-shadowroot.js',
        ),
      ],
      bundle: true,
      format: 'esm',
      outfile: join(CLIENT_OUTDIR, 'template-shadowroot.js'),
      minify: true,
      target: ['es2017'],
      legalComments: `none`,
      sourcemap: false,
      plugins: clientPlugins,
    });

    // build client-side files from generated entry files
    await esbuild.build({
      // @ts-ignore
      entryPoints: [
        existsSync(CONTENT_ENTRY) ? CONTENT_ENTRY : null,
        existsSync(FALLBACK_ENTRY) ? FALLBACK_ENTRY : null,
      ].filter(Boolean),
      bundle: true,
      minify: true,
      format: 'esm',
      outdir: CLIENT_OUTDIR,
      plugins: clientPlugins,
      sourcemap: false,
    });

    // build client-side files from source
    // these two are separate steps to avoid esbuild recreating an unwanted directory structure in dist/client/
    await esbuild.build({
      // @ts-ignore
      entryPoints: [
        existsSync(SCRIPTS_ENTRY) ? SCRIPTS_ENTRY : null,
        existsSync(LAZY_ENTRY) ? LAZY_ENTRY : null,
      ].filter(Boolean),
      bundle: true,
      minify: true,
      format: 'esm',
      outdir: CLIENT_OUTDIR,
      plugins: clientPlugins,
      sourcemap: false,
    });

    if (existsSync(CONTENT_INTERMEDIATE)) {
      renameSync(CONTENT_INTERMEDIATE, CONTENT_FINAL);
    }
    if (existsSync(FALLBACK_INTERMEDIATE)) {
      renameSync(FALLBACK_INTERMEDIATE, FALLBACK_FINAL);
    }
  } catch (error) {
    // eslint-disable-next-line
    console.error('An error occurred during the build process:', error);
  }
}
