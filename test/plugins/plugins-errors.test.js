import { test } from "tap";
import fastify from "fastify";
import httpError from "http-errors";
import plugin from "../../plugins/errors.js";

test("500 internal server error handled", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin);
  app.get("/", async (req, reply) => {
    throw new httpError.InternalServerError("The server errored");
  });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/`);
  t.equal(result.status, 500, "Status should be 500");
  await app.close();
});

test("400 bad request handled", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin);
  app.get("/", async (req, reply) => {
    throw new httpError.BadRequest();
  });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/`);
  const response = await result.json();
  t.equal(result.status, 400, "Status should be 400");
  t.equal(response.statusCode, 400, "Status should be 400");
  t.equal(response.message, "Bad Request", "Message should be bad request");
  await app.close();
});

test("Regular errors are handled", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin);
  app.get("/", async (req, reply) => {
    throw new Error("Bad things happened");
  });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/`);
  t.equal(result.status, 500, "Status should be 500");
  await app.close();
});

test("Errors decorator", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin);
  // @ts-ignore
  t.ok(app.errors === httpError, "app.errors is httpError object");
  await app.close();
});

test("Headers on errors", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin);
  app.get("/", async (req, reply) => {
    const err = new httpError.BadRequest();
    err.headers = { "podium-version": "1.0.0", "custom-header": "test" };
    throw err;
  });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/`);
  t.equal(result.status, 400, "Status should be 400");
  t.equal(result.headers.get("podium-version"), "1.0.0", "podium-version header should equal 1.0.0");
  t.equal(result.headers.get("custom-header"), "test", "custom-header header should equal test");
  await app.close();
});

test("Validation errors", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin);
  app.get("/", async (req, reply) => {
    const err = new Error("Validation error");
    // @ts-ignore
    err.validation = ["one", "two"];
    // @ts-ignore
    err.validationContext = "component error";
    throw err;
  });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/`);
  const response = await result.json();
  t.equal(result.status, 400, "Status should be 400");
  t.equal(response.statusCode, 400, "Status should be 400");
  t.equal(response.message, `A validation error occurred when validating the component error`, "Message should be correct");
  t.same(response.errors, ["one", "two"], "Errors object should be shown");
  await app.close();
});
