import * as cliApi from "@lingui/cli/api";
import { writeFileSync } from "node:fs";
import pino from "pino";
import chalk from "chalk";

/**
 * Compile messages using the Lingui API.
 * @param {object} options - The options for the lingui compile method.
 * @param {string} options.cwd - The current working directory.
 * @param {import("@lingui/conf").LinguiConfig} options.linguiConfig - Lingui config object
 * @param {import("convict").Config} config - The podlet configuration.
 * @returns {Promise<void>}
 */
export async function linguiCompile({ linguiConfig, config }) {
  try {
    const logger = pino({
      transport: {
        target: "../lib/pino-dev-transport.js",
      },
      // @ts-ignore
      level: config.get("app.logLevel").toLowerCase(),
    });

    const { locales, catalogs: configCatalogs } = linguiConfig;

    if (locales.length === 0 || configCatalogs.length === 0) return;

    const catalogs = await cliApi.getCatalogs(linguiConfig);

    for (const locale of linguiConfig.locales) {
      for (const catalog of catalogs) {
        const messages = await catalog.getTranslations(locale, {
          sourceLocale: linguiConfig.sourceLocale,
        });

        const compiledCatalog = cliApi.createCompiledCatalog(locale, messages, {
          namespace: linguiConfig.compileNamespace,
        });
        const compiledPath = await catalog.writeCompiled(locale, compiledCatalog, linguiConfig.compileNamespace);

        /**
         * If using typescript add declaration files for the compiled catalogs
         */
        if (linguiConfig.compileNamespace === "ts") {
          const typescriptPath = compiledPath.replace(/\.ts?$/, "") + ".d.ts";
          writeFileSync(
            typescriptPath,
            `import { Messages } from '@lingui/core';\ndeclare const messages: Messages;\nexport { messages };`
          );
        }

        logger.debug(chalk.magenta(`🌍 catalog rebuilt: ${locale} written to ${compiledPath}`));
      }
    }
  } catch (e) {
    console.error("lingui compilation failed", e);
  }
}
