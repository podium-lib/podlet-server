import compress from "@fastify/compress";
import fp from "fastify-plugin";

export default fp(async function compression(fastify, { enabled }) {
  if (enabled) {
    await fastify.register(compress, { global: true });
  }
});
