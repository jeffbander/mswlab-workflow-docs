import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";

export const list = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    await getCurrentUserOrThrow(ctx);

    return await ctx.db
      .query("auditLog")
      .withIndex("byCaseId", (q) => q.eq("caseId", args.caseId))
      .order("desc")
      .collect();
  },
});
