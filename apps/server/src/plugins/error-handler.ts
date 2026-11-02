import fp from "fastify-plugin";
import type { FastifyError } from "fastify";
import type { ApiErrorResponse } from "@downloader/shared";
import { AppError } from "../lib/errors.js";

// One place that turns every error into the same JSON shape: { error: { code, message } }.
export const errorHandlerPlugin = fp(async (app) => {
  app.setErrorHandler<FastifyError | AppError>((error, request, reply) => {
    // Errors we throw on purpose (NotFoundError, UnsupportedUrlError, ...)
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(errorBody(error.code, error.message));
    }

    // Request validation failed (schemas in *.schemas.ts)
    if (error.validation) {
      return reply.code(400).send(errorBody("VALIDATION_ERROR", error.message));
    }

    // Other client errors from Fastify itself (e.g. malformed JSON body)
    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send(errorBody(error.code ?? "BAD_REQUEST", error.message));
    }

    // Anything else is a bug: log the details, but don't leak them to the client.
    request.log.error({ err: error }, "Unhandled error");
    return reply.code(500).send(errorBody("INTERNAL_ERROR", "Something went wrong"));
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send(errorBody("ROUTE_NOT_FOUND", `Route ${request.method} ${request.url} does not exist`));
  });
});

function errorBody(code: string, message: string): ApiErrorResponse {
  return { error: { code, message } };
}
