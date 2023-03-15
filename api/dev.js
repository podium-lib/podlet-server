import { readFileSync } from "node:fs";
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

const joinURLPathSegments = (...segments) => {
  return segments.join("/").replace(/[\/]+/g, "/");
};

export async function dev({ config, cwd = process.cwd() }) {
  config.set("assets.development", true);

  console.log(chalk.magenta("\nStarting Podium podlet server [development mode]...\n"))
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

  // create an esbuild context object for the client side build so that we
  // can optimally rebundle whenever files change
  const buildContext = await context({
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

  spinner.succeed(chalk.cyan("bundles built"));

  // Chokidar provides super fast native file system watching
  const clientWatcher = chokidar.watch(
    ["content.*", "fallback.*", "scripts.*", "lazy.*", "client/**/*", "lib/**/*", "src/**/*"],
    {
      persistent: true,
      followSymlinks: false,
      cwd,
    }
  );

  // rebuild the client side bundle whenever a client side related file changes
  clientWatcher.on("change", async (filename) => {
    console.clear();
    const greeting = chalk.white.bold(`Podium Podlet Server (v${version})`);
    const msgBox = boxen(greeting, { padding: 0.5 });
    console.log(msgBox);
    spinner.succeed(chalk.cyan(`change detected in ${filename}`));
    await buildContext.rebuild();
    spinner.succeed(chalk.cyan("bundles rebuilt"));
    console.log(chalk.green("\ndisplaying log output:\n"));
  });

  // Esbuild built in server which provides an SSE endpoint the client can subscribe to
  // in order to know when to reload the page. Client subscribes with:
  // new EventSource('http://localhost:6935/esbuild').addEventListener('change', () => { location.reload() });
  await buildContext.serve({ port: 6935 });

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

      app.addHook("onError", (request, reply, error, done) => {
        buildContext.dispose();
        done();
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
    port: config.get("app.port"),
    ignoreTrailingSlash: true,
  });

  spinner.succeed(chalk.cyan("server started"));

  // Chokidar provides super fast native file system watching
  // of server files. Either server.js/ts or any js/ts files inside a folder named server
  const serverWatcher = chokidar.watch(["server.*", "server/**/*"], {
    persistent: true,
    followSymlinks: false,
    cwd,
  });
  serverWatcher.on("error", () => {
    buildContext.dispose();
  });

  console.log(chalk.green("\ndisplaying log output:\n"));

  // restart the server whenever a server related file changes
  serverWatcher.on("change", async (filename) => {
    console.clear();
    const greeting = chalk.white.bold(`Podium Podlet Server (v${version})`);
    const msgBox = boxen(greeting, { padding: 0.5 });
    console.log(msgBox);
    spinner.succeed(chalk.cyan(`change detected in ${filename}`));
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
  });

  // start the server for the first time
  try {
    await started.listen();
  } catch (err) {
    console.log(err);
    buildContext.dispose();
  }
}
