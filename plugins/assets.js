import { join } from "node:path";
import fp from "fastify-plugin";
import { fastifyStatic } from "@fastify/static";

/**
 * Determines if a given path or url is an absolute url
 * @param {string} pathOrUrl
 * @returns {boolean}
 */
const isAbsoluteURL = (pathOrUrl) => {
  const url = new URL(pathOrUrl, "http://local");
  if (url.origin !== "http://local") return true;
  return false;
};

/**
 * @typedef {Object} AssetsOptions
 * @property {string} [base="/static"]
 * @property {string} [cwd=process.cwd()]
 * @property {string} [dist="/dist"]
 */

/**
 * Mounts static file serving middleware into the app whenever the given base path is not absolute.
 * Typically, base would be absolute if you are serving static files from a CDN in which case static serving in the app is not needed.
 *
 * If the base path is relative, files in the dist folder are served at the base path
 *
 * @param {import("fastify").FastifyInstance} fastify
 * @param {AssetsOptions} options
 * @returns {Promise<void>}
 */
const assets = async function assets(fastify, { base = "/static", cwd = process.cwd(), dist = "/dist" }) {
  if (isAbsoluteURL(base)) return;

  await fastify.register(fastifyStatic, {
    root: join(cwd, dist),
    prefix: base,
  });
};

export default fp(assets);