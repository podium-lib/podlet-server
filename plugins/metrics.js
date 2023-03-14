import MetricsClient from "@metrics/client";
import fp from "fastify-plugin";

export default fp(async function metrics(fastify) {
  // add metrics client
  fastify.decorate("metrics", new MetricsClient());

  // process metrics streams at the end
  fastify.addHook("onReady", async function () {
    // @ts-ignore
    if (!fastify.metricStreams) return;
    // @ts-ignore
    for (const stream of fastify.metricStreams) {
      stream.on("error", (err) => {
        fastify.log.error(err);
      });
      // @ts-ignore
      stream.pipe(fastify.metrics);
    }
  });
});
