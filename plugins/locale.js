import { join } from "node:path";
import { exists } from "node:fs/promises";
import fp from "fastify-plugin";
import PathResolver from "../lib/path.js";
import chalk from "chalk";

export default fp(async function locale(fastify, { cwd = process.cwd(), locale = "en-US", development }) {
  const resolver = new PathResolver({ development, cwd });

  const contentFile = await resolver.resolve("./content");
  const compiledFileExtension = contentFile.typescript ? ".ts" : ".mjs";

  const localeFilePath = join(cwd, "locales", locale) + compiledFileExtension;

  fastify.decorate("readTranslations", async () => {
    if (await exists(localeFilePath)) {
      try {
        const { messages } = await import(localeFilePath);
        fastify.log.debug(
          `🌏 ${chalk.magenta("translations")}: loaded file "${localeFilePath}" for locale "${locale}"`
        );

        return messages;
      } catch (err) {
        fastify.log.error(`Error reading translation file: ${localeFilePath}`, err);
        return {};
      }
    }
    return {};
  });

  return undefined;
});
