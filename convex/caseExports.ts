import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow, getCurrentUserOrThrowForMutation } from "./users";

export const assertNoUnconfirmed = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    await getCurrentUserOrThrow(ctx);

    const unconfirmedEvents = await ctx.db
      .query("events")
      .withIndex("byConfirmed", (q) =>
        q.eq("caseId", args.caseId).eq("confirmed", false)
      )
      .collect();

    const allSnapshots = await ctx.db
      .query("snapshots")
      .withIndex("byCaseId", (q) => q.eq("caseId", args.caseId))
      .collect();
    const unconfirmedSnapshots = allSnapshots.filter((s) => !s.confirmed);

    const allDevices = await ctx.db
      .query("devices")
      .withIndex("byCaseId", (q) => q.eq("caseId", args.caseId))
      .collect();
    const unconfirmedDevices = allDevices.filter((d) => !d.confirmed);

    const counts = {
      events: unconfirmedEvents.length,
      snapshots: unconfirmedSnapshots.length,
      devices: unconfirmedDevices.length,
    };

    return {
      hasUnconfirmed:
        counts.events > 0 || counts.snapshots > 0 || counts.devices > 0,
      counts,
    };
  },
});

export const generateNote = mutation({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrowForMutation(ctx);
    const caseDoc = await ctx.db.get(args.caseId);

    if (!caseDoc) {
      throw new Error("Case not found");
    }

    // Get all confirmed events ordered by eventTime
    const events = await ctx.db
      .query("events")
      .withIndex("byCaseId", (q) => q.eq("caseId", args.caseId))
      .order("asc")
      .collect();
    const confirmedEvents = events.filter((e) => e.confirmed);

    // Get confirmed devices
    const devices = await ctx.db
      .query("devices")
      .withIndex("byCaseId", (q) => q.eq("caseId", args.caseId))
      .collect();
    const confirmedDevices = devices.filter((d) => d.confirmed);

    // Group events by type
    const eventsByType: Record<string, typeof confirmedEvents> = {};
    for (const event of confirmedEvents) {
      if (!eventsByType[event.eventType]) {
        eventsByType[event.eventType] = [];
      }
      eventsByType[event.eventType].push(event);
    }

    // Build structured plaintext
    const sections: string[] = [];

    // Header
    const caseTypeLabel = caseDoc.caseType.replace(/_/g, " ").toUpperCase();
    sections.push(
      `CATH LAB NURSING DOCUMENTATION`,
      `Case Type: ${caseTypeLabel}`,
      `Room: ${caseDoc.room}`,
      `Operator: ${caseDoc.operator}`,
      `Nurse: ${caseDoc.nurseName}`,
      `Date: ${new Date(caseDoc._creationTime).toLocaleDateString()}`,
      ``
    );

    // Timeout
    if (eventsByType["timeout"]?.length) {
      sections.push(`--- TIMEOUT ---`);
      for (const e of eventsByType["timeout"]) {
        const time = e.eventTime ? new Date(e.eventTime).toLocaleTimeString() : "N/A";
        sections.push(`[${time}] ${JSON.stringify(e.payload)}`);
      }
      sections.push(``);
    }

    // Access & Sedation
    const accessEvents = [
      ...(eventsByType["access"] ?? []),
      ...(eventsByType["sedation_check"] ?? []),
    ].sort((a, b) => (a.eventTime ?? 0) - (b.eventTime ?? 0));
    if (accessEvents.length) {
      sections.push(`--- ACCESS & SEDATION ---`);
      for (const e of accessEvents) {
        const time = e.eventTime ? new Date(e.eventTime).toLocaleTimeString() : "N/A";
        sections.push(`[${time}] (${e.eventType}) ${JSON.stringify(e.payload)}`);
      }
      sections.push(``);
    }

    // Hemodynamics
    if (eventsByType["hemodynamics_snapshot"]?.length) {
      sections.push(`--- HEMODYNAMICS ---`);
      for (const e of eventsByType["hemodynamics_snapshot"]) {
        const time = e.eventTime ? new Date(e.eventTime).toLocaleTimeString() : "N/A";
        sections.push(`[${time}] ${JSON.stringify(e.payload)}`);
      }
      sections.push(``);
    }

    // Devices
    if (confirmedDevices.length) {
      sections.push(`--- DEVICES ---`);
      for (const d of confirmedDevices) {
        sections.push(
          `${d.deviceType.toUpperCase()}: ${d.manufacturer} | Size: ${d.size} | Lot: ${d.lotNumber}${d.expiration ? ` | Exp: ${d.expiration}` : ""}`
        );
      }
      sections.push(``);
    }

    // Device implant events
    if (eventsByType["device_implant"]?.length) {
      sections.push(`--- DEVICE IMPLANT EVENTS ---`);
      for (const e of eventsByType["device_implant"]) {
        const time = e.eventTime ? new Date(e.eventTime).toLocaleTimeString() : "N/A";
        sections.push(`[${time}] ${JSON.stringify(e.payload)}`);
      }
      sections.push(``);
    }

    // Vitals
    if (eventsByType["vitals_snapshot"]?.length) {
      sections.push(`--- VITALS ---`);
      for (const e of eventsByType["vitals_snapshot"]) {
        const time = e.eventTime ? new Date(e.eventTime).toLocaleTimeString() : "N/A";
        sections.push(`[${time}] ${JSON.stringify(e.payload)}`);
      }
      sections.push(``);
    }

    // Medications
    if (eventsByType["med_admin"]?.length) {
      sections.push(`--- MEDICATIONS ---`);
      for (const e of eventsByType["med_admin"]) {
        const time = e.eventTime ? new Date(e.eventTime).toLocaleTimeString() : "N/A";
        sections.push(`[${time}] ${JSON.stringify(e.payload)}`);
      }
      sections.push(``);
    }

    // Complications
    if (eventsByType["complication"]?.length) {
      sections.push(`--- COMPLICATIONS ---`);
      for (const e of eventsByType["complication"]) {
        const time = e.eventTime ? new Date(e.eventTime).toLocaleTimeString() : "N/A";
        sections.push(`[${time}] ${JSON.stringify(e.payload)}`);
      }
      sections.push(``);
    }

    // Phase Markers
    if (eventsByType["phase_marker"]?.length) {
      sections.push(`--- PHASE MARKERS ---`);
      for (const e of eventsByType["phase_marker"]) {
        const time = e.eventTime ? new Date(e.eventTime).toLocaleTimeString() : "N/A";
        sections.push(`[${time}] ${JSON.stringify(e.payload)}`);
      }
      sections.push(``);
    }

    // Free text / Disposition
    if (eventsByType["free_text"]?.length) {
      sections.push(`--- DISPOSITION / NOTES ---`);
      for (const e of eventsByType["free_text"]) {
        const time = e.eventTime ? new Date(e.eventTime).toLocaleTimeString() : "N/A";
        sections.push(`[${time}] ${JSON.stringify(e.payload)}`);
      }
      sections.push(``);
    }

    const contentText = sections.join("\n");

    // Create export record
    const exportId = await ctx.db.insert("exports", {
      caseId: args.caseId,
      kind: "plaintext",
      contentText,
      createdBy: user.externalId,
    });

    await ctx.db.insert("auditLog", {
      caseId: args.caseId,
      actor: user.externalId,
      action: "export",
      targetType: "export",
      targetId: exportId as string,
      timestamp: Date.now(),
    });

    const exportRecord = await ctx.db.get(exportId);
    return exportRecord;
  },
});

export const list = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    await getCurrentUserOrThrow(ctx);

    return await ctx.db
      .query("exports")
      .withIndex("byCaseId", (q) => q.eq("caseId", args.caseId))
      .collect();
  },
});
