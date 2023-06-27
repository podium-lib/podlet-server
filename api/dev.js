import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import chokidar from "chokidar";
import { context } from "esbuild";
import pino from "pino";
import fastify from "fastify";
import httpError from "http-errors";
import PathResolver from "../lib/path.js";
import chalk from "chalk";
import boxen from "boxen";
import kill from "kill-port";
// import { createRequire } from "node:module";
import { getLinguiConfig } from "../lib/lingui-config.js";
import { linguiExtract, linguiCompile } from "../lib/lingui.js";

// const require = createRequire(import.meta.url);
const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), { encoding: "utf8" }));

function cleanEsbuildPort() {
  return kill(6935);
}

class DevServer {
  constructor({ cwd, config, logger, state, content = false }) {
    this.cwd = cwd;
    this.config = config;
    this.logger = logger;
    this.state = state;
    this.content = content;
  }

  async setup() {
    const app = fastify({
      logger: this.logger,
      ignoreTrailingSlash: true,
      forceCloseConnections: true,
      disableRequestLogging: true,
    });

    if (!this.content) {
      app.get("/", (request, reply) => {
        reply.redirect(join(this.config.get("app.base"), this.config.get("podlet.manifest")));
      });
    }

    // if content file is defined, and content url doesn't resolve to /, redirect to content route
    if (joinURLPathSegments(this.config.get("app.base"), this.config.get("podlet.content")) !== "/" && this.content) {
      app.get("/", (request, reply) => {
        reply.redirect(join(this.config.get("app.base"), this.config.get("podlet.content")));
      });
    }

    const plugins = await this.state.build();
    const extensions = this.state.get("extensions");
    for (const serverPlugin of await this.state.server()) {
      await app.register(serverPlugin, {
        cwd: this.cwd,
        prefix: this.config.get("app.base"),
        logger: this.logger,
        config: this.config,
        // @ts-ignore
        podlet: app.podlet,
        errors: httpError,
        plugins,
        extensions,
      });
    }

    // TODO: wire this up!
    app.addHook("onError", async (request, reply, error) => {
      // console.log("fastify onError hook: disposing of build context", error);
      this.logger.error(error, "fastify onError hook: disposing of build context");
      // await buildContext.dispose();
    });

    return app;
  }

  async start() {
    this.app = await this.setup();
    await this.app.listen({ port: this.config.get("app.port") });
    this.app.log.info({ url: `http://localhost:${this.config.get("app.port")}` }, `Development server listening`);
  }

  async restart() {
    const [app] = await Promise.all([this.setup(), this.app?.close()]);
    this.app = app;
    try {
      await this.app.listen({ port: this.config.get("app.port") });
    } catch (err) {
      this.logger.error(err, "Failed to restart server");
      try {
        this.logger.trace("Killing port %d", this.config.get("app.port"));
        await kill(this.config.get("app.port"));
      } catch (err) {
        this.logger.error(err, "Failed to kill port %d", this.config.get("app.port"));
      }
      this.logger.trace("Attempting to restart server again");
      await this.app.listen({ port: this.config.get("app.port") });
    }
  }
}

/**
 * Concatenate URL path segments.
 * @param {...string} segments - URL path segments to concatenate.
 * @returns {string} - The concatenated URL.
 */
const joinURLPathSegments = (...segments) => {
  return segments.join("/").replace(/[\/]+/g, "/");
};

/**
 * Set up a development environment for a Podium Podlet server.
 * @param {object} options - The options for the development environment.
 * @param {import("../lib/state").State} options.state - App state object
 * @param {import("convict").Config} options.config - The podlet configuration.
 * @param {string} [options.cwd=process.cwd()] - The current working directory.
 * @returns {Promise<void>}
 */
export async function dev({ state, config, cwd = process.cwd() }) {
  // https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/61750
  // @ts-ignore
  config.set("assets.development", true);

  const logger = pino({
    transport: {
      target: "../lib/pino-dev-transport.js",
    },
    // @ts-ignore
    level: config.get("app.logLevel").toLowerCase(),
  });

  // https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/61750
  // @ts-ignore
  const resolver = new PathResolver({ cwd, development: config.get("app.development") });

  const OUTDIR = join(cwd, "dist");
  const CLIENT_OUTDIR = join(OUTDIR, "client");

  logger.debug(`⚙️  ${chalk.magenta("app configuration")}: ${JSON.stringify(config.getProperties())}`);

  // calculate routes from config.get("podlet.content") and config.get("podlet.fallback")
  const routes = [
    {
      name: "manifest",
      path: "/manifest.json",
    },
  ];
  if (config.get("podlet.content")) {
    routes.push({ name: "content", path: config.get("podlet.content") });
  }
  if (config.get("podlet.fallback")) {
    // @ts-ignore
    routes.push({ name: "fallback", path: config.get("podlet.fallback") });
  }

  // i18n launch setup
  const linguiConfig = await getLinguiConfig({ config, cwd });
  if (linguiConfig) {
    // @ts-ignore
    await linguiExtract({ linguiConfig, cwd, hideStats: true });
    // @ts-ignore
    await linguiCompile({ linguiConfig, config });
  }

  logger.debug(
    `📍 ${chalk.magenta("routes")}: ${routes
      .map((r) => `${r.name} ${chalk.cyan(`${(config.get("app.base") + r.path).replace("//", "/")}`)}`)
      .join(", ")}`
  );

  // create dist folder if necessary
  mkdirSync(join(cwd, "dist"), { recursive: true });

  const clientFiles = [];
  /** @type {import("../lib/path.js").Resolution} */
  let CONTENT_FILEPATH;
  /** @type {import("../lib/path.js").Resolution} */
  let FALLBACK_FILEPATH;

  // build dsd ponyfill
  // await build({
  //   entryPoints: [require.resolve("@webcomponents/template-shadowroot/template-shadowroot.js")],
  //   bundle: true,
  //   format: "esm",
  //   outfile: join(CLIENT_OUTDIR, "template-shadowroot.js"),
  //   minify: true,
  //   target: ["es2017"],
  //   legalComments: `none`,
  //   sourcemap: false,
  // });

  async function createBuildContext() {
    CONTENT_FILEPATH = await resolver.resolve("./content");
    FALLBACK_FILEPATH = await resolver.resolve("./fallback");
    const SCRIPTS_FILEPATH = await resolver.resolve("./scripts");
    const LAZY_FILEPATH = await resolver.resolve("./lazy");

    const entryPoints = [];
    if (CONTENT_FILEPATH.exists) {
      entryPoints.push(CONTENT_FILEPATH.path);
    }
    if (FALLBACK_FILEPATH.exists) {
      entryPoints.push(FALLBACK_FILEPATH.path);
    }
    if (SCRIPTS_FILEPATH.exists) {
      entryPoints.push(SCRIPTS_FILEPATH.path);
    }
    if (LAZY_FILEPATH.exists) {
      entryPoints.push(LAZY_FILEPATH.path);
    }

    for (const entryPoint of entryPoints) {
      clientFiles.push(join("dist", entryPoint.replace(cwd, "")));
    }

    const plugins = await state.build();
    const ctx = await context({
      entryPoints,
      entryNames: "[name]",
      bundle: true,
      format: "esm",
      outdir: CLIENT_OUTDIR,
      minify: true,
      target: ["es2017"],
      legalComments: `none`,
      sourcemap: true,
      plugins,
    });

    // Esbuild built in server which provides an SSE endpoint the client can subscribe to
    // in order to know when to reload the page. Client subscribes with:
    // new EventSource('http://localhost:6935/esbuild').addEventListener('chang() => { location.reload() });
    await ctx.serve({ port: 6935 });
    return ctx;
  }

  // create an esbuild context object for the client side build so that we
  // can optimally rebundle whenever files change
  let buildContext = await createBuildContext();

  // create an array of files that are output by the build process

  logger.debug(`${chalk.green("♻️")}  ${chalk.magenta("bundles built")}: ${clientFiles.join(", ")}`);

  // function clientFileChange(type) {
  //   return async (filename) => {
  //     console.clear();
  //     const greeting = chalk.white.bold(`Podium Podlet Server (v${version})`);
  //     const msgBox = boxen(greeting, { padding: 0.5 });
  //     console.log(msgBox);
  //     logger.debug(`📁 ${chalk.blue(`file ${type}`)}: ${filename}`);
  //     try {
  //       // extract in case translations were added
  //       // @ts-ignore
  //       await linguiExtract({ linguiConfig, cwd, hideStats: true });
  //       // compile in case a .po file changed
  //       // @ts-ignore
  //       await linguiCompile({ linguiConfig, config });

  //       await buildContext.rebuild();
  //     } catch (err) {
  //       // esbuild agressive cachine causes it to fail when files unrelated to the build are deleted
  //       // to handle this, we dispose of the current context and create a new one.
  //       await buildContext.dispose();
  //       buildContext = await createBuildContext();
  //     }
  //     logger.debug(`${chalk.green("♻️")}  ${chalk.magenta("bundles rebuilt")}: ${clientFiles.join(", ")}`);
  //   };
  // }

  const devServer = new DevServer({
    logger: logger,
    cwd,
    config,
    state,
    // @ts-ignore
    content: CONTENT_FILEPATH.exists,
  });

  // Chokidar provides super fast native file system watching
  // of server files. Either server.js/ts or any js/ts files inside a folder named server
  const serverWatcher = chokidar.watch(
    [
      "build.js",
      "build.ts",
      "document.js",
      "document.ts",
      "server.js",
      "server.ts",
      "server/**/*.js",
      "server/**/*.ts",
      "config/**/*.json",
      "config/schema.js",
      "config/schema.ts",
      "schemas/**/*.json",
      "locale/**/*.json",
      "locales/**/*.po",
    ],
    {
      persistent: true,
      followSymlinks: false,
      cwd,
    }
  );
  serverWatcher.on("error", async (err) => {
    logger.error(err, "server watcher error: disposing of build context");
    await buildContext.dispose();
    await cleanEsbuildPort();
  });

  let debounceTimer;
  function serverFileChange(type) {
    return async (name) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        console.clear();
        const greeting = chalk.white.bold(`Podium Podlet Server (v${version})`);
        const msgBox = boxen(greeting, { padding: 0.5 });
        console.log(msgBox);
        logger.debug(`📁 ${chalk.blue(`file ${type}`)}: ${name}`);
        try {
          // extract in case translations were added
          // @ts-ignore
          await linguiExtract({ linguiConfig, cwd, hideStats: true });
          // compile in case a .po file changed
          // @ts-ignore
          await linguiCompile({ linguiConfig, config });
          // TODO: only reload the area related to the changed file
          await state.get("local").reload();
          await devServer.restart();
        } catch (err) {
          logger.error(err);
          buildContext.dispose();
        }
        logger.debug(`${chalk.green("♻️")}  ${chalk.blue("server restarted")}`);
      }, 250);
    };
  }

  // restart the server whenever a server related file changes, is added or is deleted
  serverWatcher.on("ready", () => {
    // wait 1 second for the build/app start to settle
    setTimeout(() => {
      serverWatcher.on("change", serverFileChange("changed"));
      serverWatcher.on("add", serverFileChange("added"));
      serverWatcher.on("unlink", serverFileChange("deleted"));
    }, 1000);
  });

  serverWatcher.on("error", (err) => {
    logger.error(err, "Uh Oh! Something went wrong with server side file watching. Got error");
    cleanEsbuildPort();
  });

  // start the server for the first time
  try {
    await devServer.start();
  } catch (err) {
    logger.error(err);
    await serverWatcher.close();
    buildContext.dispose();
    // ensure esbuild is cleaned up
    await cleanEsbuildPort();
    process.exit(1);
  }
}

process.on("uncaughtException", cleanEsbuildPort);
process.on("unhandledRejection", cleanEsbuildPort);
process.on("SIGINT", cleanEsbuildPort);
process.on("SIGTERM", cleanEsbuildPort);
process.on("SIGHUP", cleanEsbuildPort);
