import { join } from "path";
import fastify from "fastify";
import httpError from "http-errors";
import esbuild from "esbuild";
import configuration from "../lib/config.js";
import { Local } from "../lib/resolvers/local.js";
import { Core } from "../lib/resolvers/core.js";
import { Extensions } from "../lib/resolvers/extensions.js";
import { State } from "../lib/state.js";
import PathResolver from "../lib/path.js";
import pino from "pino"

/**
 * Concatenate URL path segments.
 * @param {...string} segments - URL path segments to concatenate.
 * @returns {string} - The concatenated URL.
 */
const joinURLPathSegments = (...segments) => {
  return segments.join("/").replace(/[\/]+/g, "/");
};

export class TestServer {
  cwd;
  development;
  config;
  state;
  app;
  port;
  address;
  logger;
  #resolver;

  static async create({ cwd = process.cwd(), development = false, loggerFunction = undefined } = {},) {
    const state = new State({ cwd });
    state.set("loggerFunction", loggerFunction);
    state.set("core", await Core.load());
    state.set("extensions", await Extensions.load({ cwd }));
    state.set("local", await Local.load({ cwd, development: true }));
    const config = await configuration({ cwd, schemas: await state.config() });
    // @ts-ignore
    config.set("assets.development", development);
    return new TestServer({ cwd, development, config, state });
  }

  constructor({ cwd, development, config, state }) {
    this.cwd = cwd;
    this.development = development;
    this.config = config;
    this.state = state;
    this.#resolver = new PathResolver({ cwd, development });
  }

  async build() {
    const { cwd, state } = this;
    const outdir = join(cwd, "dist");
    const clientOutdir = join(outdir, "client");
    const contentFilepath = await this.#resolver.resolve("./content");
    const fallbackFilepath = await this.#resolver.resolve("./fallback");
    const scriptsFilepath = await this.#resolver.resolve("./scripts");
    const lazyFilepath = await this.#resolver.resolve("./lazy");

    const entryPoints = [];
    if (contentFilepath.exists) {
      entryPoints.push(contentFilepath.path);
    }
    if (fallbackFilepath.exists) {
      entryPoints.push(fallbackFilepath.path);
    }
    if (scriptsFilepath.exists) {
      entryPoints.push(scriptsFilepath.path);
    }
    if (lazyFilepath.exists) {
      entryPoints.push(lazyFilepath.path);
    }

    await esbuild.build({
      entryPoints,
      entryNames: "[name]",
      bundle: true,
      format: "esm",
      outdir: clientOutdir,
      minify: true,
      target: ["es2017"],
      legalComments: `none`,
      sourcemap: true,
      plugins: await state.build(),
    });
  }

  async setup() {
    const logger = this.state.get("loggerFunction") || pino
    const app = fastify({
      logger: logger({
        transport: {
          target: "../lib/pino-dev-transport.js",
        },
        level: this.config.get("app.logLevel").toLowerCase(),
      }),
      ignoreTrailingSlash: true,
      forceCloseConnections: true,
      disableRequestLogging: true,
    });

    const plugins = await this.state.build();
    const extensions = this.state.get("extensions");
    for (const serverPlugin of await this.state.server()) {
      await app.register(serverPlugin, {
        cwd: this.cwd,
        prefix: this.config.get("app.base"),
        config: this.config,
        // @ts-ignore
        podlet: app.podlet,
        errors: httpError,
        plugins,
        extensions,
      });
    }

    return app;
  }

  async start() {
    this.app = await this.setup();
    this.address = await this.app.listen({ port: 0, host: "127.0.0.1" });
    this.port = this.app.server.address().port;
  }

  async stop() {
    await this.app?.close();
  }

  get routes() {
    const routeObject = {
      manifest: this.address + joinURLPathSegments(this.config.get("app.base"), this.config.get("podlet.manifest")),
    };

    if (this.config.get("podlet.content")) {
      routeObject.content =
        this.address + joinURLPathSegments(this.config.get("app.base"), this.config.get("podlet.content"));
    }

    if (this.config.get("podlet.fallback")) {
      routeObject.fallback =
        this.address + joinURLPathSegments(this.config.get("app.base"), this.config.get("podlet.fallback"));
    }

    return routeObject;
  }
}
