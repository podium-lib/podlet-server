import { join } from "node:path";
import fp from "fastify-plugin";
import resolve from "./resolve.js";
import { existsSync } from "node:fs";

// plugins
import assetsPn from "../plugins/assets.js";
import compressionPn from "../plugins/compression.js";
import dependenciesPn from "../plugins/dependencies.js";
import errorsPn from "../plugins/errors.js";
import exceptionsPn from "../plugins/exceptions.js";
import hydratePn from "../plugins/hydrate.js";
import importElementPn from "../plugins/import-element.js";
import liveReloadPn from "../plugins/live-reload.js";
import localePn from "../plugins/locale.js";
import metricsPn from "../plugins/metrics.js";
import podletPn from "../plugins/podlet.js";
import scriptPn from "../plugins/script.js";
import timingPn from "../plugins/timing.js";
import validationPn from "../plugins/validation.js";
import lazyPn from "../plugins/lazy.js";
import scriptsPn from "../plugins/scripts.js";
import ssrPn from "../plugins/ssr.js";
import csrPn from "../plugins/csr.js";
import documentPn from "../plugins/document.js";
import docsPn from "../plugins/docs.js";

const isAbsoluteURL = (pathOrUrl) => {
  const url = new URL(pathOrUrl, "http://local");
  if (url.origin !== "http://local") return true;
  return false;
};

const joinURLPathSegments = (...segments) => {
  return segments.join("/").replace(/[\/]+/g, "/");
};

const defaults = {
  headers: {},
  querystring: {},
  params: {},
};

/**
 * create an intersection type out of fastify instance and its decorated properties
 * @typedef {import("fastify").FastifyInstance & { podlet: any, metrics: any, schemas: any, importElement: function, translations: object, script: function, hydrate: function, ssr: function, csr: function }} FastifyInstance
 */

/**
 * create an intersection type out of fastify context config and its decorated properties
 * @typedef {import("fastify").FastifyContextConfig & { timing: boolean }} FastifyContextConfig
 */

export default fp(async function (fastify, { prefix = "/", extensions, cwd = process.cwd(), plugins = [], config }) {
  const base = config.get("assets.base") || "/";
  const name = config.get("app.name");
  const pathname = config.get("podlet.pathname") || "/";
  const manifest = config.get("podlet.manifest") || "/manifest.json";
  const content = config.get("podlet.content") || "/";
  const fallback = config.get("podlet.fallback") || "";
  const development = config.get("app.development") || false;
  const version = config.get("podlet.version") || null;
  const locale = config.get("app.locale") || "";
  const lazy = config.get("assets.lazy") || false;
  const scripts = config.get("assets.scripts") || false;
  const compression = config.get("app.compression");
  const grace = config.get("app.grace") || 0;
  const timeAllRoutes = config.get("metrics.timing.timeAllRoutes") || true;
  const groupStatusCodes = config.get("metrics.timing.groupStatusCodes") || true;
  const mode = config.get("app.mode") || "hydrate";

  const assetBase = isAbsoluteURL(base) ? base : joinURLPathSegments(prefix, base);
  const contentFilePath = await resolve(join(cwd, "./content.js"));
  const fallbackFilePath = await resolve(join(cwd, "./fallback.js"));

  let podlet;
  let metrics;
  let schemas;
  /** @type {stateFunction} */
  let contentStateFn = async (req, context) => ({});
  /** @type {stateFunction} */
  let fallbackStateFn = async (req, context) => ({});

  // wrap in scoped plugin for prefixed routes to work
  await fastify.register(
    async (fastify) => {
      // cast fastify to include decorated properties
      const f = /** @type {FastifyInstance} */ (fastify);

      // load plugins
      await f.register(podletPn, {
        name,
        version,
        pathname,
        manifest,
        content,
        fallback,
        development,
      });
      await f.register(lazyPn, { enabled: lazy, base: assetBase });
      await f.register(scriptsPn, { enabled: scripts, base: assetBase });
      await f.register(liveReloadPn, { development });
      await f.register(compressionPn, { enabled: compression });

      await f.register(errorsPn);
      await f.register(assetsPn, { base, cwd });
      await f.register(dependenciesPn, { enabled: development, cwd });
      await f.register(exceptionsPn, { grace: grace });
      await f.register(hydratePn, { appName: name, base: assetBase, development });
      await f.register(csrPn, { appName: name, base: assetBase, development });
      await f.register(ssrPn, { appName: name, base });
      await f.register(importElementPn, { appName: name, development, plugins, cwd });
      await f.register(localePn, { locale, cwd });
      await f.register(metricsPn);
      await f.register(scriptPn, { development });
      await f.register(timingPn, {
        timeAllRoutes,
        groupStatusCodes,
      });
      await f.register(validationPn, { prefix, defaults, mappings: { "/": "content.json" }, cwd });
      await f.register(documentPn, { podlet: f.podlet, cwd, development, extensions });
      await f.register(docsPn, { podlet: f.podlet, cwd, config, extensions });

      // routes
      if (existsSync(contentFilePath)) {
        f.get(f.podlet.content(), async (request, reply) => {
          try {
            const contextConfig = /** @type {FastifyContextConfig} */ (reply.context.config);
            contextConfig.timing = true;

            if (mode === "ssr-only" || mode === "hydrate") {
              // import server side component
              await f.importElement(contentFilePath);
            }

            const initialState = JSON.stringify(
              // @ts-ignore
              (await contentStateFn(request, reply.app.podium.context)) || ""
            );

            const translations = f.translations ? ` translations='${JSON.stringify(f.translations)}'` : "";
            const template = `<${name}-content version="${version}" locale='${locale}'${translations} initial-state='${initialState}'></${name}-content>`;
            const hydrateSupport =
              mode === "hydrate"
                ? f.script(`${prefix}/node_modules/lit/experimental-hydrate-support.js`, { dev: true })
                : "";
            const markup =
              mode === "ssr-only"
                ? f.ssr("content", template)
                : mode === "csr-only"
                ? f.csr("content", template)
                : f.hydrate("content", template);

            reply.type("text/html; charset=utf-8").send(`${hydrateSupport}${markup}`);

            return reply;
          } catch (err) {
            f.log.error(err);
          }
        });
      }

      if (existsSync(fallbackFilePath)) {
        f.get(f.podlet.fallback(), async (request, reply) => {
          try {
            const contextConfig = /** @type {FastifyContextConfig} */ (reply.context.config);
            contextConfig.timing = true;

            if (mode === "ssr-only" || mode === "hydrate") {
              // import server side component
              await f.importElement(fallbackFilePath);
            }

            const initialState = JSON.stringify(
              // @ts-ignore
              (await fallbackStateFn(request, reply.app.podium.context)) || ""
            );

            const translations = f.translations ? ` translations='${JSON.stringify(f.translations)}'` : "";
            const template = `<${name}-fallback version="${version}" locale='${locale}'${translations} initial-state='${initialState}'></${name}-fallback>`;
            const hydrateSupport =
              mode === "hydrate"
                ? f.script(`${prefix}/node_modules/lit/experimental-hydrate-support.js`, { dev: true })
                : "";
            const markup =
              mode === "ssr-only"
                ? f.ssr("fallback", template)
                : mode === "csr-only"
                ? f.csr("fallback", template)
                : f.hydrate("fallback", template);

            reply.type("text/html; charset=utf-8").send(`${hydrateSupport}${markup}`);

            return reply;
          } catch (err) {
            f.log.error(err);
          }
        });
      }

      // expose decorators to outer plugin wrapper

      podlet = f.podlet;
      metrics = f.metrics;
      schemas = f.schemas;
    },
    { prefix }
  );

  // Expose developer facing APIs using decorate
  /**
   * @typedef {(req: import('fastify').FastifyRequest, context: any) => Promise<{ [key: string]: any; [key: number]: any; } | null>} stateFunction
   */

  /**
   * @param {stateFunction} stateFunction
   */
  function setContentState(stateFunction) {
    contentStateFn = stateFunction;
  }

  /**
   * @param {stateFunction} stateFunction
   */
  function setFallbackState(stateFunction) {
    fallbackStateFn = stateFunction;
  }

  fastify.decorate("setContentState", setContentState);
  fastify.decorate("setFallbackState", setFallbackState);
  fastify.decorate("podlet", podlet);
  fastify.decorate("metrics", metrics);
  fastify.decorate("schemas", schemas);
});
