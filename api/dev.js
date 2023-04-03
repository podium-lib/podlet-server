import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import chokidar from "chokidar";
import { context } from "esbuild";
import pino from "pino";
import sandbox from "fastify-sandbox";
import { start } from "@fastify/restartable";
import httpError from "http-errors";
import fastifyPodletPlugin from "../lib/plugin.js";
import PathResolver from "../lib/path.js";
import chalk from "chalk";
import boxen from "boxen";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), { encoding: "utf8" }));

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
 * @param {import("convict").Config} options.config - The Podlet configuration.
 * @param {import("../lib/extensions/extensions").Extensions} [options.extensions] - The Podlet configuration.
 * @param {string} [options.cwd=process.cwd()] - The current working directory.
 * @returns {Promise<void>}
 */
export async function dev({ config, extensions, cwd = process.cwd() }) {
  // https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/61750
  // @ts-ignore
  config.set("assets.development", true);

  const LOGGER = pino({
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

  LOGGER.debug(`⚙️  ${chalk.magenta("app configuration")}: ${JSON.stringify(config.getProperties())}`);

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

  LOGGER.debug(
    `📍 ${chalk.magenta("routes")}: ${routes
      .map((r) => `${r.name} ${chalk.cyan(`${config.get("app.base")}${r.path}`)}`)
      .join(", ")}`
  );

  // create dist folder if necessary
  mkdirSync(join(cwd, "dist"), { recursive: true });

  const clientFiles = [];
  let CONTENT_FILEPATH;
  let FALLBACK_FILEPATH;
  let plugins;

  async function createBuildContext() {
    CONTENT_FILEPATH = await resolver.resolve("./content");
    FALLBACK_FILEPATH = await resolver.resolve("./fallback");
    const SCRIPTS_FILEPATH = await resolver.resolve("./scripts");
    const LAZY_FILEPATH = await resolver.resolve("./lazy");
    const BUILD_FILEPATH = await resolver.resolve("./build");

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

    plugins = [];
    if (extensions?.build().length) {
      for (const buildPlugin of extensions.build()) {
        const extensionDefinedPlugins = await buildPlugin.resolvedFile({ config });
        plugins.push(...extensionDefinedPlugins);
        LOGGER.debug(
          `${chalk.green("♻️")}  ${chalk.magenta("bundle plugins")}: loaded file from extension ${buildPlugin.package.name}`
        );
      }
    }
    // support user defined plugins via a build.js file
    if (BUILD_FILEPATH.exists) {
      try {
        const userDefinedBuild = (await resolver.import(BUILD_FILEPATH)).default;
        const userDefinedPlugins = await userDefinedBuild({ config });
        if (Array.isArray(userDefinedPlugins)) {
          plugins.push(...userDefinedPlugins);
        }
      } catch (err) {
        // noop
      }
      LOGGER.debug(
        `${chalk.green("♻️")}  ${chalk.magenta("bundle plugins")}: loaded file ${BUILD_FILEPATH.path.replace(cwd, "")}`
      );
    }

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

  LOGGER.debug(`${chalk.green("♻️")}  ${chalk.magenta("bundles built")}: ${clientFiles.join(", ")}`);

  // Chokidar provides super fast native file system watching
  const clientWatcher = chokidar.watch(
    [
      "content.js",
      "content.ts",
      "fallback.js",
      "fallback.ts",
      "scripts.js",
      "scripts.ts",
      "lazy.js",
      "lazy.ts",
      "client/**/*.js",
      "client/**/*.ts",
      "lib/**/*.js",
      "lib/**/*.ts",
      "src/**/*.js",
      "src/**/*.ts",
    ],
    {
      persistent: true,
      followSymlinks: false,
      cwd,
    }
  );

  function clientFileChange(type) {
    return async (filename) => {
      console.clear();
      const greeting = chalk.white.bold(`Podium Podlet Server (v${version})`);
      const msgBox = boxen(greeting, { padding: 0.5 });
      console.log(msgBox);
      LOGGER.debug(`📁 ${chalk.blue(`file ${type}`)}: ${filename}`);
      try {
        await buildContext.rebuild();
      } catch (err) {
        // esbuild agressive cachine causes it to fail when files unrelated to the build are deleted
        // to handle this, we dispose of the current context and create a new one.
        await buildContext.dispose();
        buildContext = await createBuildContext();
      }
      LOGGER.debug(`${chalk.green("♻️")}  ${chalk.magenta("bundles rebuilt")}: ${clientFiles.join(", ")}`);
    };
  }
  // let things settle before adding event handlers
  clientWatcher.on("ready", () => {
    // rebuild the client side bundle whenever a client side related file changes
    clientWatcher.on("change", clientFileChange("changed"));
    clientWatcher.on("add", clientFileChange("added"));
    clientWatcher.on("unlink", clientFileChange("deleted"));
  });

  clientWatcher.on("error", (err) => {
    LOGGER.error(err, "Uh Oh! Something went wrong with client side file watching. Got error");
  });

  // Create and start a development server
  const started = await start({
    logger: LOGGER,
    // @ts-ignore
    app: async (app, opts, done) => {
      // if no content file yet defined, redirect to manifest file
      if (!CONTENT_FILEPATH.exists) {
        app.get("/", (request, reply) => {
          reply.redirect(join(config.get("app.base"), config.get("podlet.manifest")));
        });
      }

      // if content file is defined, and content url doesn't resolve to /, redirect to content route
      if (
        joinURLPathSegments(config.get("app.base"), config.get("podlet.content")) !== "/" &&
        CONTENT_FILEPATH.exists
      ) {
        app.get("/", (request, reply) => {
          reply.redirect(join(config.get("app.base"), config.get("podlet.content")));
        });
      }

      await app.register(fastifyPodletPlugin, {
        prefix: config.get("app.base") || "/",
        pathname: config.get("podlet.pathname"),
        manifest: config.get("podlet.manifest"),
        content: config.get("podlet.content"),
        fallback: config.get("podlet.fallback"),
        base: config.get("assets.base"),
        documents: extensions?.documentTemplates,
        plugins,
        name: config.get("app.name"),
        development: config.get("app.development"),
        version: config.get("podlet.version"),
        locale: config.get("app.locale"),
        lazy: config.get("assets.lazy"),
        scripts: config.get("assets.scripts"),
        compression: config.get("app.compression"),
        grace: config.get("app.grace"),
        timeAllRoutes: config.get("metrics.timing.timeAllRoutes"),
        groupStatusCodes: config.get("metrics.timing.groupStatusCodes"),
        mode: config.get("app.mode"),
      });

      app.addHook("onError", async (request, reply, error) => {
        // console.log("fastify onError hook: disposing of build context", error);
        LOGGER.error(error, "fastify onError hook: disposing of build context");
        await buildContext.dispose();
      });

      // register extension server plugins with fastify
      for (const serverPlugin of extensions?.serverPlugins || []) {
        await app.register(serverPlugin.resolvedFile, {
          prefix: config.get("app.base"),
          logger: LOGGER,
          config,
          podlet: app.podlet,
          errors: httpError,
        });
        LOGGER.debug(`🖥️  ${chalk.magenta("server")}: loaded file from extension ${serverPlugin.package.name}`);
      }

      // register user provided plugin using sandbox to enable reloading
      // Load user server.js file if provided.
      const SERVER_FILEPATH = await resolver.buildAndResolve("./server");
      if (SERVER_FILEPATH.exists) {
        app.register(sandbox, {
          path: SERVER_FILEPATH.path,
          options: { prefix: config.get("app.base"), logger: LOGGER, config, podlet: app.podlet, errors: httpError },
        });

        if (SERVER_FILEPATH.typescript) {
          LOGGER.debug(
            `🖥️  ${chalk.magenta("server")}: loaded file server.ts after bundling as ${SERVER_FILEPATH.path.replace(
              cwd,
              ""
            )}`
          );
        } else {
          LOGGER.debug(`🖥️  ${chalk.magenta("server")}: loaded file ${SERVER_FILEPATH.path.replace(cwd, "")}`);
        }
      }

      done();
    },
    // @ts-ignore
    port: config.get("app.port"),
    ignoreTrailingSlash: true,
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
    ],
    {
      persistent: true,
      followSymlinks: false,
      cwd,
    }
  );
  serverWatcher.on("error", async (err) => {
    LOGGER.error(err, "server watcher error: disposing of build context");
    await buildContext.dispose();
  });

  function serverFileChange(type) {
    return async (filename) => {
      console.clear();
      const greeting = chalk.white.bold(`Podium Podlet Server (v${version})`);
      const msgBox = boxen(greeting, { padding: 0.5 });
      console.log(msgBox);
      LOGGER.debug(`📁 ${chalk.blue(`file ${type}`)}: ${filename}`);
      // TODO::
      // check a hash of the server.js/ts file and ensure changedFilename has actually changed
      // this might be slower than just always restarting though... measure.
      try {
        await started.restart();
      } catch (err) {
        LOGGER.error(err);
        buildContext.dispose();
      }
      LOGGER.debug(`${chalk.green("♻️")}  ${chalk.blue("server restarted")}`);
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
    LOGGER.error(err, "Uh Oh! Something went wrong with server side file watching. Got error");
  });

  // start the server for the first time
  try {
    await started.listen();
  } catch (err) {
    LOGGER.error(err);
    await clientWatcher.close();
    await serverWatcher.close();
    buildContext.dispose();
    process.exit(1);
  }
}
