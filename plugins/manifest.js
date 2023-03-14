import fp from "fastify-plugin";

export default fp(async function manifest(fastify, { config, podlet }) {
  fastify.get(podlet.manifest(), async (req, reply) => {
    // enable timing metrics for this route
    // @ts-ignore
    reply.context.config.timing = true;
    return JSON.stringify(podlet);
  });
})
