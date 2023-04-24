import fastify from "fastify";
import httpError from "http-errors";

/**
 * @typedef {import("fastify").FastifyInstance & { podlet: import("@podium/podlet").default }} FastifyInstance
 */

/**
 * Start up a production server for a Podium Podlet server app.
 * @param {object} options - The options for the development environment.
 * @param {string} [options.cwd=process.cwd()] - The current working directory.
 * @param {import("../lib/state").State} options.state - App state object
 * @param {import("convict").Config} options.config - The podlet configuration.
 * @returns {Promise<{address: string, close: function}>}
 */
export async function start({ state, config, cwd = process.cwd() }) {
  const app = /** @type {FastifyInstance}*/ (
    /**@type {unknown}*/ (
      fastify({
        logger: {
          // @ts-ignore
          level: config.get("app.logLevel").toLowerCase(),
        },
        ignoreTrailingSlash: true,
      })
    )
  );

  const plugins = await state.build();
  const extensions = await state.get("extensions");
  for (const serverPlugin of await state.server()) {
    await app.register(serverPlugin, {
      cwd,
      prefix: config.get("app.base"),
      logger: app.log,
      config,
      podlet: app.podlet,
      errors: httpError,
      plugins,
      extensions,
    });
  }

  try {
    const address = await app.listen({ host: "0.0.0.0", port: config.get("app.port") });
    app.log.info(`Server environment '${config.get("app.env")}', host '${config.get("app.host")}'`);
    return { address, close: app.close.bind(app) };
  } catch (err) {
    app.log.error(`Unable to start server on port ${config.get("app.port")}`);
    throw err;
  }
}
