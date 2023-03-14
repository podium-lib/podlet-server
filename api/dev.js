import { join } from "node:path";
import chokidar from "chokidar";
import { context } from "esbuild";
import pino from "pino";
import sandbox from "fastify-sandbox";
import { start } from "@fastify/restartable";
import httpError from "http-errors";
import fastifyPodletPlugin from "../lib/plugin.js";
import PathResolver from "../lib/path.js";

const joinURLPathSegments = (...segments) => {
  return segments.join("/").replace(/[\/]+/g, "/");
};

export async function dev({ config, cwd = process.cwd() }) {
  config.set("assets.development", true);

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
  const SERVER_FILEPATH = await resolver.buildAndResolve("./server");

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

  // Chokidar provides super fast native file system watching
  const clientWatcher = chokidar.watch(["content.*", "fallback.*", "scripts.*", "lazy.*", "client/**/*"], {
    persistent: true,
    followSymlinks: false,
    cwd,
  });

  // rebuild the client side bundle whenever a client side related file changes
  clientWatcher.on("change", async () => {
    await buildContext.rebuild();
  });

  // Esbuild built in server which provides an SSE endpoint the client can subscribe to
  // in order to know when to reload the page. Client subscribes with:
  // new EventSource('http://localhost:6935/esbuild').addEventListener('change', () => { location.reload() });
  await buildContext.serve({ port: 6935 });

  // Create and start a development server
  const started = await start({
    logger: LOGGER,
    // @ts-ignore
    app: (app, opts, done) => {
      // if no content file yet defined, redirect to manifest file
      if (!CONTENT_FILEPATH.exists) {
        app.get("/", (request, reply) => {
          reply.redirect(join(config.get("app.base"), config.get("podlet.manifest")));
        });
      }

      // if content file is defined, and content url doesn't resolve to /, redirect to content route
      if (joinURLPathSegments(config.get("app.base"), config.get("podlet.content")) !== "/" && CONTENT_FILEPATH.exists) {
        app.get("/", (request, reply) => {
          reply.redirect(join(config.get("app.base"), config.get("podlet.content")));
        });
      }

      app.register(fastifyPodletPlugin, {
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

  // Chokidar provides super fast native file system watching
  // of server files. Either server.js or any js files inside a server folder
  const serverWatcher = chokidar.watch(["server.*", "server/**/*"], {
    persistent: true,
    followSymlinks: false,
    cwd,
  });
  serverWatcher.on("error", () => {
    buildContext.dispose();
  });

  // restart the server whenever a server related file changes
  serverWatcher.on("change", async () => {
    try {
      await started.restart();
    } catch (err) {
      console.log(err);
      buildContext.dispose();
    }
  });

  // start the server for the first time
  try {
    await started.listen();
  } catch (err) {
    console.log(err);
    buildContext.dispose();
  }
}
