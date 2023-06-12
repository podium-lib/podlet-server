import fastify from "fastify";

/**
 * Wrapper around Fastify application that handles registration of plugins and configuration
 */
export class Application {
  #app;
  #context;

  /**
   * @param {import("./context").Context} context
   */
  constructor(context) {
    this.#context = context;
  }

  async start() {
    this.#app = fastify({
      logger: this.#context.logger,
      ignoreTrailingSlash: true,
      forceCloseConnections: true,
      disableRequestLogging: !this.#context.development,
    });

    for (const plugin of this.#context.extensions.server) {
      await this.#app.register(plugin, this.#context);
    }

    if (this.#context.files.server) {
      await this.#app.register(this.#context.files.server, this.#context);
    }

    this.#app.listen({ port: this.#context.config.get("app.port") });
  }

  async stop() {
    await this.#app.close();
  }
}
