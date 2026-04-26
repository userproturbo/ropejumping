import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const systemRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({
    status: "ok",
  })),
});
