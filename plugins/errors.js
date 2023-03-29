import httpError from "http-errors";
import fp from "fastify-plugin";

export default fp(async function errors(fastify) {
  fastify.setErrorHandler((error, _, reply) => {
    fastify.log.error(error);
    let err;

    // check if we have a validation error
    if (error.validation) {
      err = new httpError.BadRequest(`A validation error occurred when validating the ${error.validationContext}`);
      err.errors = error.validation;
    } else {
      err = httpError.isHttpError(error) ? error : new httpError.InternalServerError();

      if (err.headers) {
        for (const key in err.headers) {
          reply.header(key, err.headers[key]);
        }
      }
    }

    reply.status(err.status);
    if (err.expose) {
      reply.send({
        statusCode: err.statusCode,
        message: err.message || undefined,
        errors: err.errors || undefined,
      });
    } else {
      reply.send("");
    }
  });

  fastify.decorate("errors", httpError);
});
