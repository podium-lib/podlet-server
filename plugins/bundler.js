import { join } from "node:path";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import esbuild from "esbuild";
import etag from "@fastify/etag";
import fp from "fastify-plugin";
import httpError from "http-errors";

const require = createRequire(import.meta.url);

const build = async ({ entryPoints = [] } = {}) => {
  const result = await esbuild.build({
    resolveExtensions: [".js", ".ts"],
    legalComments: "none",
    entryPoints,
    charset: "utf8",
    plugins: [],
    target: "esnext",
    bundle: true,
    format: "esm",
    outdir: `${tmpdir()}/podlet-name`,
    minify: true,
    write: false,
    sourcemap: "inline",
  });

  return result.outputFiles[0].text;
};

/**
 * @typedef {import("fastify").FastifyRequest<{Params: { "*": string }}>} Request
 */

export default fp(async function bundler(fastify, { cwd = process.cwd(), development = false }) {
  if (!development) return;

  await fastify.register(etag, { algorithm: "fnv1a" });

  fastify.get("/_/dynamic/modules/*", async (/** @type {Request} */ request, reply) => {
    const depname = request.params["*"];

    try {
      const filepath = require.resolve(depname, { paths: [cwd, new URL("../", import.meta.url).pathname] });
      const body = await build({ entryPoints: [filepath] });

      reply.type("application/javascript");
      reply.send(body);
      return reply;
    } catch (err) {
      fastify.log.debug(`Serving 404 - Not Found - Unable to resolve file path for ${depname}.`);
      throw new httpError.NotFound();
    }
  });

  fastify.get("/_/dynamic/files/:file.js", async (/** @type {Request} */ request, reply) => {
    const filename = request.params["file"];

    try {
      const body = await build({ entryPoints: [join(cwd, filename)] });
      reply.type("application/javascript");
      reply.send(body);
      return reply;
    } catch (err) {
      fastify.log.debug(`Serving 404 - Not Found - Unable to resolve file path for ${filename}.`);
      throw new httpError.NotFound();
    }
  });
});
