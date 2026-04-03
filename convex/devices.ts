import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow, getCurrentUserOrThrowForMutation } from "./users";

export const create = mutation({
  args: {
    caseId: v.id("cases"),
    deviceType: v.union(
      v.literal("stent"),
      v.literal("balloon"),
      v.literal("wire"),
      v.literal("catheter"),
      v.literal("closure")
    ),
    manufacturer: v.string(),
    size: v.string(),
    lotNumber: v.string(),
    expiration: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrowForMutation(ctx);

    const deviceId = await ctx.db.insert("devices", {
      caseId: args.caseId,
      deviceType: args.deviceType,
      manufacturer: args.manufacturer,
      size: args.size,
      lotNumber: args.lotNumber,
      expiration: args.expiration,
      confirmed: false,
    });

    await ctx.db.insert("auditLog", {
      caseId: args.caseId,
      actor: user.externalId,
      action: "create",
      targetType: "device",
      targetId: deviceId as string,
      timestamp: Date.now(),
    });

    return deviceId;
  },
});

export const list = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    await getCurrentUserOrThrow(ctx);

    return await ctx.db
      .query("devices")
      .withIndex("byCaseId", (q) => q.eq("caseId", args.caseId))
      .collect();
  },
});

export const confirm = mutation({
  args: { deviceId: v.id("devices") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrowForMutation(ctx);
    const device = await ctx.db.get(args.deviceId);

    if (!device) {
      throw new Error("Device not found");
    }

    await ctx.db.patch(args.deviceId, { confirmed: true });

    await ctx.db.insert("auditLog", {
      caseId: device.caseId,
      actor: user.externalId,
      action: "confirm",
      targetType: "device",
      targetId: args.deviceId as string,
      timestamp: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    deviceId: v.id("devices"),
    manufacturer: v.string(),
    size: v.string(),
    lotNumber: v.string(),
    expiration: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrowForMutation(ctx);
    const oldDevice = await ctx.db.get(args.deviceId);

    if (!oldDevice) {
      throw new Error("Device not found");
    }

    const beforeSnapshot = {
      manufacturer: oldDevice.manufacturer,
      size: oldDevice.size,
      lotNumber: oldDevice.lotNumber,
      expiration: oldDevice.expiration,
    };

    await ctx.db.patch(args.deviceId, {
      manufacturer: args.manufacturer,
      size: args.size,
      lotNumber: args.lotNumber,
      expiration: args.expiration,
    });

    const afterSnapshot = {
      manufacturer: args.manufacturer,
      size: args.size,
      lotNumber: args.lotNumber,
      expiration: args.expiration,
    };

    await ctx.db.insert("auditLog", {
      caseId: oldDevice.caseId,
      actor: user.externalId,
      action: "update",
      targetType: "device",
      targetId: args.deviceId as string,
      beforeSnapshot,
      afterSnapshot,
      timestamp: Date.now(),
    });
  },
});
