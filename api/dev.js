import { join } from "node:path";
import chokidar from "chokidar";
import pino from "pino";
import fastify from "fastify";
import httpError from "http-errors";
import PathResolver from "../lib/path.js";
import { WebSocketServer } from "ws";
import { getLinguiConfig } from "../lib/lingui-config.js";
import { linguiExtract, linguiCompile } from "../lib/lingui.js";
import { joinURLPathSegments } from "../lib/utils.js";

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export class DevServer {
  /** @type {string} */
  cwd;

  /** @type {import("convict").Config} */
  config;

  /** @type {import("pino").BaseLogger} */
  logger;

  /** @type {import("../lib/state.js").State} */
  state;

  /** @type {boolean} */
  content;

  /** @type {import("fastify").FastifyInstance} */
  app;

  /** @type {chokidar.FSWatcher} */
  sWatcher;

  /** @type {import("@lingui/conf").LinguiConfig} */
  linguiConfig;

  /** @type {WebSocketServer} */
  websocketServer;

  /** @type {PathResolver} */
  pathResolver;

  /**
   *
   * @param {{ cwd: string, config: import("convict").Config, state: import("../lib/state.js").State, content?: boolean, logger?: import("pino").BaseLogger }} options
   */
  constructor({ cwd, config, state, logger }) {
    this.cwd = cwd;
    this.config = config;
    this.logger =
      logger ||
      pino({
        transport: {
          target: "../lib/pino-dev-transport.js",
        },
        // @ts-ignore
        level: config.get("app.logLevel").toLowerCase(),
      });
    this.state = state;
    this.sWatcher = chokidar.watch(
      [
        "build.js",
        "build.ts",
        "document.js",
        "document.ts",
        "server.js",
        "server.ts",
        "server/**/*.js",
        "server/**/*.ts",
        "config/**/*.json",
        "config/schema.js",
        "config/schema.ts",
        "schemas/**/*.json",
        "locale/**/*.json",
        "locales/**/*.po",
      ],
      {
        persistent: true,
        followSymlinks: false,
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        cwd,
      }
    );
    this.cWatcher = chokidar.watch(
      [
        "content.js",
        "content.ts",
        "fallback.js",
        "fallback.ts",
        "scripts.js",
        "scripts.ts",
        "lazy.js",
        "lazy.ts",
        "client/**/*.js",
        "client/**/*.ts",
        "lib/**/*.js",
        "lib/**/*.ts",
        "src/**/*.js",
        "src/**/*.ts",
        "locales/**/*.po",
      ],
      {
        persistent: true,
        followSymlinks: false,
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        cwd,
      }
    );
    this.webSocketServer = new WebSocketServer({
      // @ts-ignore
      port: config.get("development.liveReload.port"),
    });
    /**
     * @typedef {import("ws").WebSocket & { isAlive: boolean }} WebSocketE
     */

    this.webSocketServer.on(
      "connection",
      /** @param {WebSocketE} ws */
      (ws) => {
        this.logger.debug("live reload - server got connection from browser");
        ws.isAlive = true;
        ws.on("pong", () => {
          ws.isAlive = true;
        });
        ws.on("error", (error) => {
          this.logger.debug("live reload - connection to browser errored");
          this.logger.error(error);
        });
      }
    );

    const pingpong = setInterval(() => {
      this.webSocketServer.clients.forEach((client) => {
        // Typescript casting dance to add the isAlive property to WebSocket
        const c = /** @type {WebSocketE} */ (client);
        if (c.isAlive === false) return c.terminate();
        c.isAlive = false;
        c.ping();
      });
    }, 30000);

    this.cWatcher.on("close", function close() {
      clearInterval(pingpong);
    });

    this.pathResolver = new PathResolver({ development: true, cwd });
  }

  async #setup() {
    // extract in case translations were added
    await linguiExtract({ linguiConfig: this.linguiConfig, cwd: this.cwd, hideStats: true });
    // compile in case a .po file changed
    await linguiCompile({ linguiConfig: this.linguiConfig, config: this.config });

    await this.state.get("local").reload();

    const app = fastify({
      logger: this.logger,
      ignoreTrailingSlash: true,
      forceCloseConnections: true,
      disableRequestLogging: true,
    });

    const contentFile = await this.pathResolver.resolve("./content");
    if (!contentFile.exists) {
      app.get("/", (request, reply) => {
        reply.redirect(join(this.config.get("app.base"), this.config.get("podlet.manifest")));
      });
    }

    // if content file is defined, and content url doesn't resolve to /, redirect to content route
    else if (joinURLPathSegments(this.config.get("app.base"), this.config.get("podlet.content")) !== "/") {
      app.get("/", (request, reply) => {
        reply.redirect(join(this.config.get("app.base"), this.config.get("podlet.content")));
      });
    }

    const plugins = await this.state.build();
    const extensions = this.state.get("extensions");
    for (const serverPlugin of await this.state.server()) {
      await app.register(serverPlugin, {
        cwd: this.cwd,
        // @ts-ignore
        prefix: this.config.get("app.base"),
        logger: this.logger,
        config: this.config,
        // @ts-ignore
        podlet: app.podlet,
        errors: httpError,
        plugins,
        extensions,
        webSocketServer: this.webSocketServer,
        clientWatcher: this.cWatcher,
      });
    }

    return app;
  }

  #listenForChangesAndRestart() {
    this.sWatcher.on("add", (file) => {
      if (file.startsWith("config/")) {
        this.logger.warn(`App configuration has changed, please restart the development server to apply changes`);
        return;
      }
      debounce(this.restart.bind(this), 500)();
    });
    this.sWatcher.on("change", (file) => {
      if (file.startsWith("config/")) {
        this.logger.warn(`App configuration has changed, please restart the development server to apply changes`);
        return;
      }
      debounce(this.restart.bind(this), 500)();
    });
    this.sWatcher.on("unlink", (file) => {
      if (file.startsWith("config/")) {
        this.logger.warn(`App configuration has changed, please restart the development server to apply changes`);
        return;
      }
      debounce(this.restart.bind(this), 500);
    });
  }

  async start() {
    const linguiConfig = await getLinguiConfig({ config: this.config, cwd: this.cwd });
    if (linguiConfig) {
      this.linguiConfig = linguiConfig;
    }
    this.app = await this.#setup();
    await this.app.listen({ port: this.config.get("app.port") });
    this.app.log.info({ url: `http://localhost:${this.config.get("app.port")}` }, `Development server listening`);
    this.#listenForChangesAndRestart();
  }

  async restart() {
    // clean up any listeners added by plugins
    this.cWatcher.removeAllListeners();
    this.sWatcher.removeAllListeners();
    await this.app.close();
    this.app = await this.#setup();
    await this.app.listen({ port: this.config.get("app.port") });
    await this.app.ready();
    this.app.log.info(
      { url: `http://localhost:${this.config.get("app.port")}` },
      `Development server restarted and listening`
    );
    this.#listenForChangesAndRestart();
  }
}
