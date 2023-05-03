import { join } from "node:path";
import fs from "node:fs";
import fp from "fastify-plugin";
import PathResolver from "../lib/path.js";
import chalk from "chalk";

export default fp(async function locale(fastify, { cwd = process.cwd(), locale = "en", development }) {
  const resolver = new PathResolver({ development, cwd });

  const contentFile = await resolver.resolve("./content");
  const compiledFileExtension = contentFile.typescript ? ".ts" : ".mjs";

  const localeFilePath = join(cwd, "locales", locale) + compiledFileExtension;

  fastify.decorate("readTranslations", async () => {
    try {
      const { messages } = await import(`${localeFilePath}?s=${Date.now()}`);
      fastify.log.debug(`🌏 ${chalk.magenta("translations")}: loaded file "${localeFilePath}" for locale "${locale}"`);

      return messages;
    } catch (err) {
      try {
        await fs.promises.access(localeFilePath, fs.F_OK);
        fastify.log.error(`Error reading translation file: ${localeFilePath}`, err);
        return;
      } catch {
        return;
      }
    }
  });
});
