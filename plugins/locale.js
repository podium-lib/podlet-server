import { join } from "node:path";
import { existsSync } from "node:fs";
import fp from "fastify-plugin";
import chalk from "chalk";
import PathResolver from "../lib/path.js";

export default fp(async function locale(fastify, { cwd = process.cwd(), locale = "en-US", development }) {
  const resolver = new PathResolver({ development, cwd });

  const contentFile = await resolver.resolve("./content");
  const compiledFileExtension = contentFile.typescript ? ".ts" : ".mjs";

  const localeFilePath = join(cwd, "locales", locale) + compiledFileExtension;

  if (existsSync(localeFilePath)) {
    try {
      const { messages } = await resolver.import(localeFilePath);

      fastify.decorate("translations", messages);
      fastify.log.debug(`🌏 ${chalk.magenta("translations")}: loaded file "${localeFilePath}" for locale "${locale}"`);
    } catch (err) {
      fastify.log.error(`Error reading translation file: ${localeFilePath}`, err);
    }
  }
});
