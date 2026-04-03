import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow, getCurrentUserOrThrowForMutation } from "./users";

export const create = mutation({
  args: {
    caseId: v.id("cases"),
    eventType: v.union(
      v.literal("timeout"),
      v.literal("med_admin"),
      v.literal("access"),
      v.literal("sedation_check"),
      v.literal("hemodynamics_snapshot"),
      v.literal("vitals_snapshot"),
      v.literal("device_implant"),
      v.literal("complication"),
      v.literal("free_text")
    ),
    eventTime: v.number(),
    source: v.union(
      v.literal("manual"),
      v.literal("ocr"),
      v.literal("asr")
    ),
    payload: v.any(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrowForMutation(ctx);

    const confirmed = args.source === "manual";

    const eventId = await ctx.db.insert("events", {
      caseId: args.caseId,
      eventType: args.eventType,
      eventTime: args.eventTime,
      source: args.source,
      payload: args.payload,
      confidence: args.confidence,
      confirmed,
      ...(confirmed
        ? { confirmedAt: Date.now(), confirmedBy: user.externalId }
        : {}),
    });

    await ctx.db.insert("auditLog", {
      caseId: args.caseId,
      actor: user.externalId,
      action: "create",
      targetType: "event",
      targetId: eventId as string,
      timestamp: Date.now(),
    });

    return eventId;
  },
});

export const list = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    await getCurrentUserOrThrow(ctx);

    return await ctx.db
      .query("events")
      .withIndex("byCaseId", (q) => q.eq("caseId", args.caseId))
      .order("asc")
      .collect();
  },
});

export const update = mutation({
  args: {
    eventId: v.id("events"),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrowForMutation(ctx);
    const oldEvent = await ctx.db.get(args.eventId);

    if (!oldEvent) {
      throw new Error("Event not found");
    }

    const beforeSnapshot = { payload: oldEvent.payload };

    await ctx.db.patch(args.eventId, { payload: args.payload });

    await ctx.db.insert("auditLog", {
      caseId: oldEvent.caseId,
      actor: user.externalId,
      action: "update",
      targetType: "event",
      targetId: args.eventId as string,
      beforeSnapshot,
      afterSnapshot: { payload: args.payload },
      timestamp: Date.now(),
    });
  },
});

export const confirm = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrowForMutation(ctx);
    const event = await ctx.db.get(args.eventId);

    if (!event) {
      throw new Error("Event not found");
    }

    await ctx.db.patch(args.eventId, {
      confirmed: true,
      confirmedAt: Date.now(),
      confirmedBy: user.externalId,
    });

    await ctx.db.insert("auditLog", {
      caseId: event.caseId,
      actor: user.externalId,
      action: "confirm",
      targetType: "event",
      targetId: args.eventId as string,
      timestamp: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrowForMutation(ctx);
    const oldEvent = await ctx.db.get(args.eventId);

    if (!oldEvent) {
      throw new Error("Event not found");
    }

    await ctx.db.delete(args.eventId);

    await ctx.db.insert("auditLog", {
      caseId: oldEvent.caseId,
      actor: user.externalId,
      action: "delete",
      targetType: "event",
      targetId: args.eventId as string,
      beforeSnapshot: oldEvent,
      timestamp: Date.now(),
    });
  },
});

export const countUnconfirmed = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    await getCurrentUserOrThrow(ctx);

    const unconfirmed = await ctx.db
      .query("events")
      .withIndex("byConfirmed", (q) =>
        q.eq("caseId", args.caseId).eq("confirmed", false)
      )
      .collect();

    return unconfirmed.length;
  },
});
