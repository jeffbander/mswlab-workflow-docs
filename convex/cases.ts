import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow, getCurrentUserOrThrowForMutation } from "./users";

export const create = mutation({
  args: {
    caseType: v.union(
      v.literal("diagnostic_cath"),
      v.literal("pci"),
      v.literal("ep_study"),
      v.literal("structural")
    ),
    room: v.string(),
    operator: v.string(),
    nurseName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrowForMutation(ctx);

    const caseId = await ctx.db.insert("cases", {
      userId: user.externalId,
      caseType: args.caseType,
      room: args.room,
      operator: args.operator,
      nurseName: args.nurseName,
      status: "active",
      demoMode: true,
    });

    await ctx.db.insert("auditLog", {
      caseId,
      actor: user.externalId,
      action: "create",
      targetType: "case",
      targetId: caseId as string,
      timestamp: Date.now(),
    });

    return caseId;
  },
});

export const get = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const caseDoc = await ctx.db.get(args.caseId);

    if (!caseDoc) {
      throw new Error("Case not found");
    }
    if (caseDoc.userId !== user.externalId) {
      throw new Error("Unauthorized: you do not own this case");
    }

    return caseDoc;
  },
});

export const list = query({
  args: { status: v.optional(v.union(
    v.literal("active"),
    v.literal("completed"),
    v.literal("exported")
  )) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    let cases;
    if (args.status) {
      cases = await ctx.db
        .query("cases")
        .withIndex("byStatus", (q) =>
          q.eq("userId", user.externalId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    } else {
      cases = await ctx.db
        .query("cases")
        .withIndex("byUserId", (q) => q.eq("userId", user.externalId))
        .order("desc")
        .collect();
    }

    return cases;
  },
});

export const complete = mutation({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrowForMutation(ctx);
    const caseDoc = await ctx.db.get(args.caseId);

    if (!caseDoc) {
      throw new Error("Case not found");
    }
    if (caseDoc.userId !== user.externalId) {
      throw new Error("Unauthorized: you do not own this case");
    }

    await ctx.db.patch(args.caseId, {
      status: "completed",
      completedAt: Date.now(),
    });

    await ctx.db.insert("auditLog", {
      caseId: args.caseId,
      actor: user.externalId,
      action: "update",
      targetType: "case",
      targetId: args.caseId as string,
      timestamp: Date.now(),
    });
  },
});

export const wipe = mutation({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrowForMutation(ctx);
    const caseDoc = await ctx.db.get(args.caseId);

    if (!caseDoc) {
      throw new Error("Case not found");
    }
    if (caseDoc.userId !== user.externalId) {
      throw new Error("Unauthorized: you do not own this case");
    }

    // Delete all related events
    const events = await ctx.db
      .query("events")
      .withIndex("byCaseId", (q) => q.eq("caseId", args.caseId))
      .collect();
    for (const event of events) {
      await ctx.db.delete(event._id);
    }

    // Delete all related snapshots
    const snapshots = await ctx.db
      .query("snapshots")
      .withIndex("byCaseId", (q) => q.eq("caseId", args.caseId))
      .collect();
    for (const snapshot of snapshots) {
      await ctx.db.delete(snapshot._id);
    }

    // Delete all related devices
    const devices = await ctx.db
      .query("devices")
      .withIndex("byCaseId", (q) => q.eq("caseId", args.caseId))
      .collect();
    for (const device of devices) {
      await ctx.db.delete(device._id);
    }

    // Delete all related exports
    const exports = await ctx.db
      .query("exports")
      .withIndex("byCaseId", (q) => q.eq("caseId", args.caseId))
      .collect();
    for (const exp of exports) {
      await ctx.db.delete(exp._id);
    }

    // Delete all related audit log entries
    const auditEntries = await ctx.db
      .query("auditLog")
      .withIndex("byCaseId", (q) => q.eq("caseId", args.caseId))
      .collect();
    for (const entry of auditEntries) {
      await ctx.db.delete(entry._id);
    }

    // Delete the case itself
    await ctx.db.delete(args.caseId);
  },
});
