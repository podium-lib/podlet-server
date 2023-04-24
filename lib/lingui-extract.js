import * as cliApi from "@lingui/cli/api";
import Table from "cli-table";
import { relative } from "node:path";

/**
 *
 * @param {import("@lingui/conf").CatalogConfig} catalog - a lingui catalog
 * @returns an array containing [total number of string, number of translated strings]
 */
function getStats(catalog) {
  return [Object.keys(catalog).length, Object.keys(catalog).filter((key) => !catalog[key].translation).length];
}

/**
 *
 * @param {import("@lingui/conf").LinguiConfig} options.config - lingui config object
 * @param {import("@lingui/conf").CatalogConfig[]} catalogs - a list of lingui catalogs
 * @returns a cli table with catalog stats
 */
function printExtractionStats(config, catalogs) {
  const table = new Table({
    head: ["Language", "Total count", "Missing"],
    colAligns: ["left", "middle", "middle"],
    style: {
      head: ["green"],
      border: [],
      compact: true,
    },
  });

  Object.keys(catalogs).forEach((locale) => {
    const catalog = catalogs[locale];
    // catalog is null if no catalog exists on disk and the locale
    // was not extracted due to a `--locale` filter
    const [all, translated] = catalog ? getStats(catalog) : ["-", "-"];

    if (config.sourceLocale === locale) {
      table.push({ [`${locale} (source)`]: [all, "-"] });
    } else {
      table.push({ [locale]: [all, translated] });
    }
  });

  return table;
}

/**
 * Extract messages using the Lingui API.
 * @param {object} options - The options for the development environment.
 * @param {string} options.cwd - The current working directory.
 * @param {import("@lingui/conf").LinguiConfig} options.linguiConfig - Lingui config object
 * @param {boolean} [options.hideStats=false] - Whether to hide the stats table or not
 * @returns {Promise<void>}
 */
export async function linguiExtract({ linguiConfig, cwd, hideStats = false }) {
  const locales = { linguiConfig };

  if (locales.length === 0) return;

  try {
    const catalogs = await cliApi.getCatalogs(linguiConfig);
    const catalogStats = {};

    for (let catalog of catalogs) {
      const result = await catalog.make({
        verbose: true,
        clean: false,
        overwrite: false,
        locale: null,
        prevFormat: null,
        orderBy: "origin",
      });

      catalogStats[relative(cwd, catalog.path)] = result;
    }

    !hideStats &&
      Object.entries(catalogStats).forEach(([key, value]) => {
        console.log(`Catalog statistics for ${key}: `);
        console.log(printExtractionStats(linguiConfig, value).toString());
        console.log();
      });
  } catch (e) {
    console.error("lingui extraction failed", e);
  }
}
