import fs from "fs/promises";
import path from "path";
import { createRequire } from "node:module";

export class Extensions {
  options = {};
  configSchemas = [];
  fallbackFiles = [];
  buildPlugins = [];
  documentTemplates = [];
  serverPlugins = [];

  constructor(options) {
    this.options = options;
  }

  async load() {
    const { cwd } = this.options;

    // read package.json file from cwd, read it and parse it using JSON.parse
    let packageJson;
    try {
      packageJson = JSON.parse(await fs.readFile(path.join(cwd, "package.json"), "utf8"));
    } catch (err) {
      // no package.json file found,
      // so no extensions to load
      return;
    }
    // read all package.json dependencies and for each, read its package.json file
    // and parse it using JSON.parse
    const dependencies = Object.keys(packageJson.dependencies || {});
    const extensionPackages = (await Promise.all(
      dependencies
        .map(async (dependency) => {
          // resolve dependency using dep resolving mechanism
          const require = createRequire(path.join(cwd, "/"));
          try {
            const resolvedDependency = require.resolve(dependency);
            // get the directory of the resolved dependency
            const resolvedDependencyDir = path.dirname(resolvedDependency);
            // read package.json file from resolved dependency
            const packageJSON = JSON.parse(await fs.readFile(path.join(resolvedDependencyDir, "package.json"), "utf8"));

            if (
              !Array.isArray(packageJSON.podium?.extension) ||
              !packageJSON.podium.extension.includes("podlet-server")
            ) {
              return { dir: "", package: {}, resolved: false };
            }

            return {
              dir: resolvedDependencyDir,
              package: packageJSON,
              resolved: true,
            };
          } catch (err) {
            // ignore
            return { dir: "", package: {}, resolved: false };
          }
        })
    )).filter((extensionPackage) => extensionPackage.resolved);

    for (const extensionPackage of extensionPackages) {
      // look for the existence of each type of file in the extension
      // if it exists, push it to the array of that type of file
      const configSchemaFile = path.join(extensionPackage.dir, "config", "schema.js");
      try {
        this.configSchemas.push(
          { ...extensionPackage, resolvedFile: (await import(configSchemaFile)).default }
        );
      } catch (err) {
        // ignore
      }

      // const fallbackFile = path.join(extensionPackage.dir, "fallback.js");
      // try {
      //   this.fallbackFiles.push(
      //     { ...extensionPackage, resolvedFile: (await import(fallbackFile)).default }
      //   );
      // } catch (err) {
      //   // ignore
      // }

      const buildPluginFile = path.join(extensionPackage.dir, "build.js");
      try {
        this.buildPlugins.push(
          { ...extensionPackage, resolvedFile: (await import(buildPluginFile)).default }
        );
      } catch (err) {
        // ignore
      }

      const documentTemplateFile = path.join(extensionPackage.dir, "document.js");
      try {
        this.documentTemplates.push(
          { ...extensionPackage, resolvedFile: (await import(documentTemplateFile)).default }
        );
      } catch (err) {
        // ignore
      }

      const serverPluginFile = path.join(extensionPackage.dir, "server.js");
      try {
        this.serverPlugins.push(
          { ...extensionPackage, resolvedFile: (await import(serverPluginFile)).default }
        );
      } catch (err) {
        // ignore
      }
    }
  }
}

export default async function loadExtensions(options) {
  const extensions = new Extensions(options);
  await extensions.load();
  return extensions;
}
