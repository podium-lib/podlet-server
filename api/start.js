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
 * @param {import("../lib/extensions/extensions").Extensions} [options.extensions] - The Podlet configuration.
 * @param {string} [options.cwd=process.cwd()] - The current working directory.
 * @returns {Promise<{address: string, close: function}>}
 */
export async function start({ config, extensions, cwd = process.cwd() }) {
  // https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/61750
  // @ts-ignore
  const resolver = new PathResolver({ cwd, development: config.get("app.development") });
  const BUILD_FILEPATH = await resolver.resolve("./build");
  const SERVER_FILEPATH = await resolver.resolve("./server");

  const plugins = [];
  if (extensions?.build()) {
    for (const buildPlugin of extensions.build()) {
      const extensionDefinedPlugins = await buildPlugin({ config });
      plugins.push(...extensionDefinedPlugins);
    }
  }
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
  }

  const app = /** @type {FastifyInstance}*/ (
    /**@type {unknown}*/ (
      fastify({
        logger: {
          level: config.get("app.logLevel").toLowerCase(),
        },
        ignoreTrailingSlash: true,
      })
    )
  );
  app.register(fastifyPodletPlugin, {
    cwd,
    prefix: config.get("app.base") || "/",
    pathname: config.get("podlet.pathname"),
    manifest: config.get("podlet.manifest"),
    content: config.get("podlet.content"),
    fallback: config.get("podlet.fallback"),
    base: config.get("assets.base"),
    plugins,
    documents: extensions?.document(),
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

  // register extension server plugins with fastify
  for (const serverPlugin of extensions?.server() || []) {
    await app.register(serverPlugin.resolvedFile, {
      prefix: config.get("app.base"),
      logger: app.log,
      config,
      podlet: app.podlet,
      errors: httpError,
    });
  }

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
    const address = await app.listen({ host: "0.0.0.0", port: config.get("app.port") });
    return { address, close: app.close.bind(app) };
  } catch (err) {
    app.log.error(`Unable to start application on port ${config.get("app.port")}`);
    throw err;
  }
}
