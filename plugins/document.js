import fp from "fastify-plugin";
import chalk from "chalk";
import PathResolver from "../lib/path.js";

/**
 * @typedef {{ podlet: import("@podium/podlet").default, cwd: string, development: boolean }} DocumentPluginOptions
 */

export default fp(async function documentPlugin(
  fastify,
  /**@type {DocumentPluginOptions}*/
  { podlet, cwd, development }
) {
  // check if document.js or document.ts are present in cwd
  // if so, first transpile document.ts file (if present) to .js file and then load/read document.js and register it as a podlet view
  // if not, do nothing
  const resolver = new PathResolver({ cwd, development });
  const documentFile = await resolver.resolve("./document");
  if (documentFile.exists) {
    try {
      const document = await resolver.import("./document");
      podlet.view(document.default);
      fastify.log.debug(`📄 ${chalk.magenta("document template")}: loaded file ${documentFile.path.replace(cwd, "")}`);
    } catch (err) {
      fastify.log.fatal(err, `document.js file located but could not be loaded.`);
    }
  }
});
