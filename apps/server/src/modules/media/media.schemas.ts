import { z } from "zod";

// Input validation for the media routes. Invalid requests are rejected with 400
// before the route handler runs.

export const resolveMediaBody = z.object({
  url: z.string().trim().min(1, "url is required").max(2048, "url is too long"),
});

export const downloadMediaQuery = z.object({
  token: z.string().min(1).max(8192),
});
