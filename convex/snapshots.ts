import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow, getCurrentUserOrThrowForMutation } from "./users";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCurrentUserOrThrowForMutation(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    caseId: v.id("cases"),
    kind: v.union(
      v.literal("hemodynamics"),
      v.literal("vitals"),
      v.literal("device_label")
    ),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrowForMutation(ctx);

    const snapshotId = await ctx.db.insert("snapshots", {
      caseId: args.caseId,
      kind: args.kind,
      storageId: args.storageId,
      confirmed: false,
    });

    await ctx.db.insert("auditLog", {
      caseId: args.caseId,
      actor: user.externalId,
      action: "create",
      targetType: "snapshot",
      targetId: snapshotId as string,
      timestamp: Date.now(),
    });

    return snapshotId;
  },
});

export const list = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    await getCurrentUserOrThrow(ctx);

    return await ctx.db
      .query("snapshots")
      .withIndex("byCaseId", (q) => q.eq("caseId", args.caseId))
      .collect();
  },
});

export const updateExtraction = mutation({
  args: {
    snapshotId: v.id("snapshots"),
    ocrRaw: v.any(),
    extractedData: v.any(),
  },
  handler: async (ctx, args) => {
    await getCurrentUserOrThrowForMutation(ctx);

    await ctx.db.patch(args.snapshotId, {
      ocrRaw: args.ocrRaw,
      extractedData: args.extractedData,
    });
  },
});

export const confirm = mutation({
  args: { snapshotId: v.id("snapshots") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrowForMutation(ctx);
    const snapshot = await ctx.db.get(args.snapshotId);

    if (!snapshot) {
      throw new Error("Snapshot not found");
    }

    await ctx.db.patch(args.snapshotId, { confirmed: true });

    await ctx.db.insert("auditLog", {
      caseId: snapshot.caseId,
      actor: user.externalId,
      action: "confirm",
      targetType: "snapshot",
      targetId: args.snapshotId as string,
      timestamp: Date.now(),
    });
  },
});

export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
