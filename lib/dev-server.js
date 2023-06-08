import { join } from "node:path";
import fastify from "fastify";
import httpError from "http-errors";
import kill from "kill-port";

/**
 * Concatenate URL path segments.
 * @param {...string} segments - URL path segments to concatenate.
 * @returns {string} - The concatenated URL.
 */
const joinURLPathSegments = (...segments) => {
  return segments.join("/").replace(/[\/]+/g, "/");
};

// register bundler plugin
// register live reload plugin




// 1. cases to not restart the server but reload the page
// send a reload message on ws and then client reloads the page
// which gets a fresh copy of the content.js, fallback.js, scripts.js, lazy.js files ssr as well

// content.js changes (send reload message on ws and then client reloads the page)
// fallback.js changes (send reload message on ws and then client reloads the page)
// scripts.js changes (send reload message on ws and then client reloads the page)
// lazy.js changes (send reload message on ws and then client reloads the page)
// src files change (send reload message on ws and then client reloads the page)

// 2. cases to restart the server
// server.js changes (reload from disk and restart server)
// server dependencies change (reload from disk and restart server)
// config changes (reload from disk and restart server)
// translations change (rebuild translations, reload from disk and restart server)


export class DevServer {
  constructor({ cwd, config, logger, state, content = false }) {
    this.cwd = cwd;
    this.config = config;
    this.logger = logger;
    this.state = state;
    this.content = content;
  }

  async setup() {
    const app = fastify({
      logger: this.logger,
      ignoreTrailingSlash: true,
      forceCloseConnections: true,
    });

    if (!this.content) {
      app.get("/", (request, reply) => {
        reply.redirect(join(this.config.get("app.base"), this.config.get("podlet.manifest")));
      });
    }

    // if content file is defined, and content url doesn't resolve to /, redirect to content route
    if (joinURLPathSegments(this.config.get("app.base"), this.config.get("podlet.content")) !== "/" && this.content) {
      app.get("/", (request, reply) => {
        reply.redirect(join(this.config.get("app.base"), this.config.get("podlet.content")));
      });
    }

    const plugins = await this.state.build();
    const extensions = this.state.get("extensions");
    for (const serverPlugin of await this.state.server()) {
      await app.register(serverPlugin, {
        cwd: this.cwd,
        prefix: this.config.get("app.base"),
        logger: this.logger,
        config: this.config,
        // @ts-ignore
        podlet: app.podlet,
        errors: httpError,
        plugins,
        extensions,
      });
    }

    // TODO: wire this up!
    app.addHook("onError", async (request, reply, error) => {
      // console.log("fastify onError hook: disposing of build context", error);
      this.logger.error(error, "fastify onError hook: disposing of build context");
      // await buildContext.dispose();
    });

    return app;
  }

  async start() {
    this.app = await this.setup();
    await this.app.listen({ port: this.config.get("app.port") });
    this.app.log.info({ url: `http://localhost:${this.config.get("app.port")}` }, `Development server listening`);
  }

  async restart() {
    const [app] = await Promise.all([this.setup(), this.app?.close()]);
    this.app = app;
    try {
      await this.app.listen({ port: this.config.get("app.port") });
    } catch (err) {
      this.logger.error(err, "Failed to restart server");
      try {
        this.logger.trace("Killing port %d", this.config.get("app.port"));
        await kill(this.config.get("app.port"));
      } catch (err) {
        this.logger.error(err, "Failed to kill port %d", this.config.get("app.port"));
      }
      this.logger.trace("Attempting to restart server again");
      await this.app.listen({ port: this.config.get("app.port") });
    }
  }
}
