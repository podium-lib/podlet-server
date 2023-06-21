export class Metrics {
  /** 
   * @type {import("@metrics/client")[]}
   */
  streams = [];

  /**
   * @type {import("./context").Context}
   */
  #context;

  /**
   * @param {import("./context").Context} context 
   */
  constructor(context) {
    this.#context = context;
  }

  /**
   *
   * @param {import("@metrics/client")} client
   */
  add(client) {
    this.streams.push(client);
  }
}
