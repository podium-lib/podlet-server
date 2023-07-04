import { join } from "node:path";
import PathResolver from "../lib/path.js";

/**
 *
 * @param {object} options
 * @param {string} options.cwd - The current working directory.
 * @param {import("convict").Config} options.config - The podlet configuration.
 * @returns {Promise<import("@lingui/conf").LinguiConfig | undefined>}
 */
export async function getLinguiConfig({ config, cwd }) {
  try {
    const resolver = new PathResolver({ cwd });
    const resolvedContentFile = await resolver.resolve("./content");

    const compileNamespace = resolvedContentFile.typescript ? "ts" : "es";
    return {
      // @ts-ignore
      locales: config.get("app.locales") || ["en", "nb"],
      sourceLocale: "en",
      rootDir: cwd,
      format: "po",
      catalogs: [
        {
          include: [join(cwd, "{{content,fallback,document}.{js,ts},src/**/*.{js,ts},client/**/*.{js,ts}}")],
          path: join(cwd, "locales/{locale}"),
          exclude: [join(cwd, "node_modules"), join(cwd, "dist")],
        },
      ],
      compileNamespace,
      extractorParserOptions: {
        flow: false,
        tsExperimentalDecorators: false,
      },
    };
  } catch (e) {
    console.error("lingui config failed", e);
  }
}
