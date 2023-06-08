import fastify from "fastify";

/**
 * Wrapper around Fastify application that handles registration of plugins and configuration
 */
export class Application {
  #app;
  #state;

  /**
   * @param {import("./state").State} state 
   */
  constructor(state) {
    this.#state = state;
  }

  async start() {
    this.#app = fastify({
      logger: this.#state.logger,
      ignoreTrailingSlash: true,
      forceCloseConnections: true,
      disableRequestLogging: !this.#state.development,
    });

    for (const plugin of this.#state.extensions.server) {
      await this.#app.register(plugin, this.#state);
    }

    if (this.#state.files.has("./server")) {
    await this.#app.register(this.#state.files.get("./server"), this.#state);
    }
    this.#app.listen({ port: this.#state.config.get("app.port") });
  }

  async stop() {
    await this.#app.close();
  }
}
