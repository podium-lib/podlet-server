import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import chokidar from "chokidar";
import { context } from "esbuild";
import pino from "pino";
import sandbox from "fastify-sandbox";
import { start } from "@fastify/restartable";
import httpError from "http-errors";
import ora from "ora";
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
 * @param {string} [options.cwd=process.cwd()] - The current working directory.
 * @returns {Promise<void>}
 */
export async function dev({ config, cwd = process.cwd() }) {
  // https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/61750
  // @ts-ignore
  config.set("assets.development", true);

  console.log(chalk.magenta("\nStarting Podium podlet server [development mode]...\n"));
  const spinner = ora({
    spinner: "point",
  });

  const LOGGER = pino({
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  });

  // https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/61750
  // @ts-ignore
  const resolver = new PathResolver({ cwd, development: config.get("app.development") });

  const OUTDIR = join(cwd, "dist");
  const CLIENT_OUTDIR = join(OUTDIR, "client");
  const CONTENT_FILEPATH = await resolver.resolve("./content");
  const FALLBACK_FILEPATH = await resolver.resolve("./fallback");
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

  spinner.succeed(chalk.cyan("build plugins loaded"));
  // support user defined plugins via a build.js file
  const plugins = [];
  if (BUILD_FILEPATH.exists) {
    try {
      const userDefinedBuild = (await resolver.import(BUILD_FILEPATH)).default;
      const userDefinedPlugins = await userDefinedBuild({ config });
      if (Array.isArray(userDefinedPlugins)) {
        plugins.unshift(...userDefinedPlugins);
      }
    } catch (err) {
      // noop
    }
  }

  // create dist folder if necessary
  mkdirSync(join(cwd, "dist"), { recursive: true });

  async function createBuildContext() {
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
    // new EventSource('http://localhost:6935/esbuild').addEventListener('change', () => { location.reload() });
    await ctx.serve({ port: 6935 });
    return ctx;
  }

  // create an esbuild context object for the client side build so that we
  // can optimally rebundle whenever files change
  let buildContext = await createBuildContext();

  spinner.succeed(chalk.cyan("bundles built"));

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
      spinner.succeed(chalk.cyan(`file ${type}: ${filename}`));
      try {
        await buildContext.rebuild();
      } catch (err) {
        // esbuild agressive cachine causes it to fail when files unrelated to the build are deleted
        // to handle this, we displose of the current context and create a new one.
        await buildContext.dispose();
        buildContext = await createBuildContext();
      }
      spinner.succeed(chalk.cyan("bundles rebuilt"));
      console.log(chalk.green("\ndisplaying log output:\n"));
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
    console.error("Uh Oh! Something went wrong with client side file watching. Got error", err);
  });

  spinner.succeed(chalk.cyan("live reload server started"));
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
        console.log("fastify onError hook: disposing of build context", error);
        await buildContext.dispose();
      });

      // register user provided plugin using sandbox to enable reloading
      // Load user server.js file if provided.
      const SERVER_FILEPATH = await resolver.buildAndResolve("./server");
      if (SERVER_FILEPATH.exists) {
        app.register(sandbox, {
          path: SERVER_FILEPATH.path,
          options: { prefix: config.get("app.base"), logger: LOGGER, config, podlet: app.podlet, errors: httpError },
        });
      }

      done();
    },
    // @ts-ignore
    port: config.get("app.port"),
    ignoreTrailingSlash: true,
  });

  spinner.succeed(chalk.cyan("server started"));

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
    console.log("server watcher error: disposing of build context", err);
    await buildContext.dispose();
  });

  console.log(chalk.green("\ndisplaying log output:\n"));

  function serverFileChange(type) {
    return async (filename) => {
      console.clear();
      const greeting = chalk.white.bold(`Podium Podlet Server (v${version})`);
      const msgBox = boxen(greeting, { padding: 0.5 });
      console.log(msgBox);
      spinner.succeed(chalk.cyan(`file ${type}: ${filename}`));
      // TODO::
      // check a hash of the server.js/ts file and ensure changedFilename has actually changed
      // this might be slower than just always restarting though... measure.
      try {
        await started.restart();
      } catch (err) {
        console.log(err);
        buildContext.dispose();
      }
      spinner.succeed(chalk.cyan("server restarted"));
      console.log(chalk.green("\ndisplaying log output:\n"));
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
    console.error("Uh Oh! Something went wrong with server side file watching. Got error", err);
  });

  // start the server for the first time
  try {
    await started.listen();
  } catch (err) {
    console.log(err);
    await clientWatcher.close();
    await serverWatcher.close();
    buildContext.dispose();
    process.exit(1);
  }
}
