import pino from "pino";
import chalk from "chalk";
import { getLinguiConfig, linguiExtract, linguiCompile } from "../lib/lingui.js";

/**
 * Handle i18n extraction and compilation for the podlet
 * @param {string} command - The command to run.
 * @param {import("convict").Config} config - The podlet configuration.
 * @param {string} cwd - The current working directory.
 * @returns {Promise<void>}
 */
export async function i18n({ command, config, cwd = process.cwd }) {
  const logger = pino({
    transport: {
      target: "../lib/pino-dev-transport.js",
    },
    // @ts-ignore
    level: config.get("app.logLevel").toLowerCase(),
  });

  const linguiConfig = await getLinguiConfig({ config, cwd });

  try {
    switch (command) {
      case "extract": {
        await linguiExtract({ linguiConfig, cwd });
        break;
      }
      case "compile": {
        await linguiCompile({ linguiConfig, config });
        break;
      }
      default:
        logger.error(
          chalk.red("Could not resolve what i18n command to run - please specify either extract or compile")
        );
        break;
    }

    process.exit();
  } catch (e) {
    logger.error("Error while running i18n command: ", e);
    process.exit(1);
  }
}
