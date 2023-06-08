import convict from "convict";
import { existsSync } from "fs";
import { join } from "path";

const schema = {
  app: {
    host: {
      doc: "The hostname the app will bind.",
      format: String,
      default: "localhost",
      env: "HOST",
    },
    port: {
      doc: "The port the app will bind.",
      format: "port",
      default: 8080,
      env: "PORT",
    },
    env: {
      doc: "The environment the app will run in.",
      format: ["local", "dev", "prod"],
      default: "local",
      env: "NODE_ENV",
    },
  },
};

export class Config {
  #state;
  #config;

  /**
   * @param {import("./state").State} state
   */
  constructor(state) {
    this.#state = state;
  }

  async load() {
    const { cwd } = this.#state;

    // load custom formats
    for (const format of this.#state.extensions.config.formats) {
      convict.addFormat(format);
    }

    // @ts-ignore
    const config = (this.#config = convict({ ...schema, ...this.#state.extensions.config.schema }));

    // The expectation is that HOST and NODE_ENV env vars will be set in production
    // @ts-ignore
    const host = config.get("app.host");
    // @ts-ignore
    const env = config.get("app.env");

    // load comon config overrides if provided
    // common.json is supported so that users can override core config without needing to override for multiple environments or hosts
    if (existsSync(join(cwd, `${join("config", "common")}.json`))) {
      config.loadFile(join(cwd, `${join("config", "common")}.json`));
    }

    // load specific overrides if provided
    // fine grained config overrides. Hosts and env overrides etc.
    if (existsSync(join(cwd, `${join("config", "hosts", host, "config")}.${env}.json`))) {
      config.loadFile(join(cwd, `${join("config", "hosts", host, "config")}.${env}.json`));
    }

    config.validate();
  }

  get(key) {
    return this.#config.get(key);
  }

  has(key) {
    return this.#config.has(key);
  }
}
