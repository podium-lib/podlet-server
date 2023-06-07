import crypto from "crypto";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import esbuild from "esbuild";
import fp from "fastify-plugin";
import httpError from "http-errors";
import { rm } from "fs/promises";

const require = createRequire(import.meta.url);

/**
 * @typedef {import("fastify").FastifyRequest<{Params: { "*": string }}>} Request
 */

export default fp(async function dependencies(fastify, { enabled = false, cwd = process.cwd() }) {
  // typically, you should not be enabling this outside of development mode
  if (enabled) {
    const tmp = join(tmpdir(), crypto.randomUUID());
    // cache built dependencies for subsequent requests
    const cache = new Map();

    // define route that handles requests for dependencies in node_modules
    fastify.get("/node_modules/*", async (/** @type {Request} */ request, reply) => {
      // grab dependency name from route url
      const depname = request.params["*"];
      // check if dependency has already been processed and cached, if not, we process and cache
      if (!cache.has(depname)) {
        let filepath = "";
        try {
          // resolve the full path to the dependency using node's dep resolving mechanism
          filepath = require.resolve(depname, { paths: [cwd] });
        } catch (err) {
          fastify.log.debug(`Serving 404 - Not Found - Unable to resolve file path for ${depname}.`);
          throw new httpError.NotFound();
        }

        let outfile = "";
        try {
          // build path to temp location to build file to
          outfile = join(tmp, depname);
          // use esbuild to build file to location
          await esbuild.build({
            entryPoints: [filepath],
            bundle: true,
            format: "esm",
            outfile,
            minify: true,
            sourcemap: "inline",
          });
        } catch (err) {
          fastify.log.debug(`Serving 500 - Internal Server error - Unable to bundle file ${filepath}.`);
          throw new httpError.InternalServerError();
        }

        let contents = "";
        try {
          // read the file contents back into mem
          contents = await readFile(outfile, { encoding: "utf8" });
        } catch (err) {
          fastify.log.debug(`Serving 500 - Internal Server error - Unable to read file at ${outfile}.`);
          throw new httpError.InternalServerError();
        }

        // cache file contents
        cache.set(depname, contents);
      }
      // respond with cached file contents
      reply.type("application/javascript").send(cache.get(depname));
      // fastify compress needs us to return reply to avoid early stream termination
      return reply;
    });

    fastify.addHook("onClose", async () => {
      try {
        await rm(tmp, { recursive: true, force: true });
      } catch (err) {
        fastify.log.error(`Cleaning up tmp dir failed: ${tmp}`);
      }
    });
  }
});
