import fp from "fastify-plugin";
import ResponseTiming from "fastify-metrics-js-response-timing";

export default fp(async function timing(fastify, { timeAllRoutes, groupStatusCodes }) {
  const responseTiming = new ResponseTiming({
    timeAllRoutes,
    groupStatusCodes,
  });
  fastify.register(responseTiming.plugin());

  // @ts-ignore
  if (!fastify.metricStreams) {
    fastify.decorate("metricStreams", []);
  }
  // @ts-ignore
  fastify.metricStreams.push(responseTiming.metrics);
});
