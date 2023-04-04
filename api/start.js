import fastify from "fastify";
import httpError from "http-errors";
import { State } from "../lib/state.js";

/**
 * @typedef {import("fastify").FastifyInstance & { podlet: import("@podium/podlet").default }} FastifyInstance
 */

/**
 * Start up a production server for a Podium Podlet server app.
 * @param {object} options - The options for the development environment.
 * @param {string} [options.cwd=process.cwd()] - The current working directory.
 * @param {import("../lib/extensions/extensions").Extensions} options.extensions - The podlet extensions file resolution object.
 * @param {import("../lib/core").Core} options.core - The podlet core file resolution object.
 * @param {import("../lib/local").Local} options.local - The podlet local app file resolution object.
 * @param {import("convict").Config} options.config - The podlet configuration.
 * @returns {Promise<{address: string, close: function}>}
 */
export async function start({ core, extensions, local, config, cwd = process.cwd() }) {
  const state = new State();
  state.set("core", core);
  state.set("extensions", extensions);
  state.set("local", local);

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

  for (const serverPlugin of state.server || []) {
    await app.register(serverPlugin, {
      cwd,
      prefix: config.get("app.base"),
      logger: app.log,
      config,
      podlet: app.podlet,
      errors: httpError,
      plugins: state.build,
      extensions,
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
