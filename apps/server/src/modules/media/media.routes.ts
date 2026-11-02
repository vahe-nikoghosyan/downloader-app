import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { ListProvidersResponse } from "@downloader/shared";
import { attachmentHeader } from "../../lib/files.js";
import { listProviders } from "../../providers/registry.js";
import { downloadMediaQuery, resolveMediaBody } from "./media.schemas.js";
import { downloadMedia, resolveMedia } from "./media.service.js";

// HTTP layer only: validate input, call the service, send the result.
// Errors are thrown by the service and turned into JSON by the error handler.
export const mediaRoutes: FastifyPluginAsyncZod = async (app) => {
  // Which sites are supported
  app.get("/media/providers", async (): Promise<ListProvidersResponse> => {
    return { providers: listProviders() };
  });

  // Link in → images/videos found, with download links
  app.post("/media/resolve", { schema: { body: resolveMediaBody } }, async (request) => {
    return resolveMedia(request.body.url);
  });

  // Streams the file to the client as it arrives from the source
  app.get("/media/download", { schema: { querystring: downloadMediaQuery } }, async (request, reply) => {
    const file = await downloadMedia(request.query.token);

    reply
      .header("content-type", file.contentType)
      .header("content-disposition", attachmentHeader(file.filename))
      .header("cache-control", "private, max-age=3600");
    if (file.contentLength !== undefined) reply.header("content-length", file.contentLength);

    return reply.send(file.stream);
  });
};
