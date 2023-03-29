import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import fp from "fastify-plugin";
import chalk from "chalk";
import emojiFlags from "emoji-flags";

// function that takes a locale string and returns the emoji flag for that locale
// handles formats like en-US, en, en-US-POSIX 
// map countries to languages
function getFlag(locale) {
  if (!locale) return "";
  const countryCode = locale.split("-")[1];
  if (!countryCode) return "";
  return `${emojiFlags.countryCode(countryCode).emoji}  `;
}

export default fp(async function locale(fastify, { cwd = process.cwd(), locale = "" }) {
    const localFilePath = join(cwd, "locale", locale) + ".json";
    if (existsSync(localFilePath)) {
      try {
        const translations = JSON.parse(readFileSync(localFilePath, { encoding: "utf8" }));
        fastify.decorate("translations", translations);
        fastify.log.debug(`${getFlag(locale)}${chalk.magenta("translations")}: loaded file "${localFilePath}" for locale "${locale}"`);
      } catch (err) {
        fastify.log.error(`Error reading translation file: ${localFilePath}`, err);
      }
    }
});
