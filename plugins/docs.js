import fp from "fastify-plugin";
import Configuration from "./docs/handlers/configuration.get.js";
import Docs from "./docs/handlers/docs.get.js";
import Routes from "./docs/handlers/routes.get.js";

/**
 * @typedef {{ podlet: import("@podium/podlet").default, cwd: string, config: import("convict").Config, extensions?: import("../lib/resolvers/extensions").Extensions }} DocumentPluginOptions
 */

export default fp(async function docsPlugin(
  fastify,
  /**@type {DocumentPluginOptions}*/
  { podlet, cwd, config, extensions }
) {
  // @ts-ignore
  if (config.get("app.development") === true) {
    const docs = new Docs({ config, extensions });
    const configuration = new Configuration({ config });
    
    function buildUrlPath(path) {
      return path.replaceAll(/\/+/g, "/");
    }

    const routeData = {
      routes: {
        content: {
          // @ts-ignore
          path: buildUrlPath(`/${config.get("app.base")}/${config.get("podlet.content")}`),
        },
        manifest: {
          path: buildUrlPath(`/${config.get("app.base")}/${config.get("podlet.manifest")}`),
          data: JSON.parse(JSON.stringify(podlet)),
        },
        fallback: {
          path: buildUrlPath(`/${config.get("app.base")}/${config.get("podlet.fallback")}`),
        },
      },
      assets: {
        content: buildUrlPath(`/${config.get("assets.base")}/client/content.js`),
        fallback: buildUrlPath(`/${config.get("assets.base")}/client/fallback.js`),
        scripts: false,
        lazy: buildUrlPath(`/${config.get("assets.base")}/client/lazy.js`),
      },
    };
    
    // @ts-ignore
    const routes = new Routes({ data: routeData, schemas: fastify.schemas });

    fastify.get("/docs", docs.handler.bind(docs));
    fastify.get("/docs/configuration", configuration.handler.bind(configuration));
    fastify.get("/docs/routes", routes.handler.bind(routes));
  }
});
