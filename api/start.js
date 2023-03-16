import fastify from "fastify";
import httpError from "http-errors";
import fastifyPodletPlugin from "../lib/plugin.js";
import PathResolver from "../lib/path.js";

/**
 * @typedef {import("fastify").FastifyInstance & { podlet: import("@podium/podlet").default }} FastifyInstance
 */

/**
 * Start up a production server for a Podium Podlet server app.
 * @param {object} options - The options for the development environment.
 * @param {import("convict").Config} options.config - The Podlet configuration.
 * @param {string} [options.cwd=process.cwd()] - The current working directory.
 * @returns {Promise<void>}
 */
export async function start({ config, cwd = process.cwd() }) {
  // https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/61750
  // @ts-ignore
  const resolver = new PathResolver({ cwd, development: config.get("app.development") });
  const BUILD_FILEPATH = await resolver.resolve("./build");
  const SERVER_FILEPATH = await resolver.resolve("./server");

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

  const app = /** @type {FastifyInstance}*/ (
    /**@type {unknown}*/ (fastify({ logger: true, ignoreTrailingSlash: true }))
  );
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

  const { podlet } = app;

  // Load user server.js file if provided.
  if (SERVER_FILEPATH.exists) {
    app.register((await resolver.import(SERVER_FILEPATH)).default, {
      prefix: config.get("app.base"),
      logger: app.log,
      config,
      podlet,
      errors: httpError,
    });
  }

  try {
    await app.listen({ port: config.get("app.port") });
  } catch (err) {
    console.log(err);
  }
}
