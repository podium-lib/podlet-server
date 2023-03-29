import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import fp from "fastify-plugin";
import Ajv from "ajv";
import chalk from "chalk";
import merge from "lodash.merge";

/**
 * fastify: fastify instance
 * options
 *   prefix: where the plugin is mounted eg. /base/path
 *   cwd: base dir for the app, usually process.cwd()
 *   defaults: initial default set of validation rules (json schema)
 *   mappings: object mapping a route path to a schema file name that should be in the schemas folder. eg. { "/": "content.json" }
 */
export default fp(async function validation(
  fastify,
  { prefix = "", cwd = process.cwd(), defaults = {}, mappings = {} }
) {
  // overwrite built in compilers to ensure that values that aren't in a schema are stripped from their respective
  // locations.
  const schemaCompilers = {
    body: new Ajv({
      removeAdditional: "all",
      coerceTypes: false,
      allErrors: true,
    }),
    params: new Ajv({
      removeAdditional: "all",
      coerceTypes: true,
      allErrors: true,
    }),
    querystring: new Ajv({
      removeAdditional: "all",
      coerceTypes: true,
      allErrors: true,
    }),
    headers: new Ajv({
      removeAdditional: "all",
      coerceTypes: true,
      allErrors: true,
    }),
  };

  fastify.setValidatorCompiler((req) => {
    if (!req.httpPart) {
      throw new Error("Missing httpPart");
    }
    const compiler = schemaCompilers[req.httpPart];
    if (!compiler) {
      throw new Error(`Missing compiler for ${req.httpPart}`);
    }
    return compiler.compile(req.schema);
  });

  const logs = [];

  /**
   * Hook in as each route is defined and try to load in schema files for that route.
   * For the / case, a schema file name must be passed to this plugin
   *
   * This plugin is sync only and is only run when the app is first booted
   */
  fastify.addHook("onRoute", function (routeOptions) {
    // only handle GET requests
    if (routeOptions.method !== "GET") return;
    // strip off provided base

    const { routePath } = routeOptions;

    let schemaPath;

    // check provided mappings
    if (mappings[routePath || "/"]) {
      schemaPath = join(cwd, "schemas", `${mappings[routePath || "/"]}`);
    } else {
      // general case
      schemaPath = join(cwd, "schemas", `${routePath}.json`);
    }

    routeOptions.schema = {};

    // register user defined validation schema for route if provided
    // looks for a file named by schemaPath and if present, loads
    // and provides to route.
    const schema = JSON.parse(JSON.stringify(defaults));
    if (existsSync(schemaPath)) {
      const userSchema = JSON.parse(readFileSync(schemaPath, { encoding: "utf8" }));
      merge(schema, userSchema);
      logs.push(
        `🔍 ${chalk.magenta("validation")}: loaded file ${schemaPath.replace(cwd, "")}, schema: ${JSON.stringify(schema)}`
      );
    }

    // append schema to route options
    routeOptions.schema = schema;
  });

  fastify.addHook("onReady", () => {
    if (logs.length) {
      fastify.log.debug(logs.join("\n"));
    }
  });
});
