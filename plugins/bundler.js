import { join } from "node:path";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import esbuild from "esbuild";
import etag from "@fastify/etag";
import fp from "fastify-plugin";

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
  });
  return result.outputFiles[0].text;
};

export default fp(
  async (fastify, { cwd = process.cwd() }) => {
    await fastify.register(etag, { algorithm: "fnv1a" });

    fastify.get("/_/dynamic/modules/*", async (request, reply) => {
      // does not work in our case, see https://github.com/fastify/fastify/issues/3331
      // const depname = request.params["*"];
      
      // instead, we have to do it manually
      const parts = request.url.split("/_/dynamic/modules/");
      const depname = parts[parts.length - 1];
      const filepath = require.resolve(depname, { paths: [cwd] });
      const body = await build({ entryPoints: [filepath] });

      reply.type("application/javascript");
      reply.send(body);
    });

    fastify.get("/_/dynamic/files/:file.js", async (request, reply) => {
      // does not work in our case, see https://github.com/fastify/fastify/issues/3331
      // const filename = request.params["file"];
      
      // instead, we have to do it manually
      const parts = request.url.split("/foo/_/dynamic/files/");
      const filename = parts[parts.length - 1];
      const body = await build({ entryPoints: [join(cwd, filename)] });

      console.log(body);

      reply.type("application/javascript");
      reply.send(body);
    });
  },
  {
    name: "plugin-bundler",
  }
);
