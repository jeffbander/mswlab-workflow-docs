import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { paymentAttemptSchemaValidator } from "./paymentAttemptTypes";

export default defineSchema({
    users: defineTable({
      name: v.string(),
      // this the Clerk ID, stored in the subject JWT field
      externalId: v.string(),
      // Primary email from Clerk
      email: v.optional(v.string()),
    })
      .index("byExternalId", ["externalId"])
      .index("byEmail", ["email"]),

    paymentAttempts: defineTable(paymentAttemptSchemaValidator)
      .index("byPaymentId", ["payment_id"])
      .index("byUserId", ["userId"])
      .index("byPayerUserId", ["payer.user_id"]),

    // Security monitoring table
    // userId is optional to allow logging violations from unauthenticated requests
    securityEvents: defineTable({
      userId: v.optional(v.id("users")),
      eventType: v.union(
        v.literal("origin_mismatch"),
        v.literal("rate_limit_exceeded"),
        v.literal("invalid_api_key"),
        v.literal("fingerprint_change"),
        v.literal("suspicious_activity"),
        v.literal("jwt_validation_failed"),
        v.literal("unauthorized_access"),
        v.literal("input_validation_failed"),
        v.literal("replay_detected"),
        v.literal("not_found_enumeration"),
        v.literal("jwt_algorithm_attack"),
        v.literal("tenant_isolation_attack"),
        v.literal("jwt_replay_attack"),
        v.literal("xss_attempt"),
        v.literal("fingerprint_manipulation"),
        v.literal("http_origin_blocked"),
        v.literal("prompt_injection_attempt"),
        v.literal("ai_response_validation_failed"),
        v.literal("csrf_validation_failed")
      ),
      severity: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      ),
      metadata: v.object({
        origin: v.optional(v.string()),
        ipAddress: v.optional(v.string()),
        fingerprint: v.optional(v.string()),
        endpoint: v.optional(v.string()),
        errorMessage: v.optional(v.string()),
        endUserEmail: v.optional(v.string()),
        endUserName: v.optional(v.string()),
        endUserId: v.optional(v.string()),
        actionType: v.optional(v.string()),
        requestPayload: v.optional(v.string()),
      }),
      timestamp: v.number(),
      isRead: v.boolean(),
    })
      .index("byUser", ["userId", "timestamp"])
      .index("bySeverity", ["userId", "severity", "timestamp"])
      .index("byUnread", ["userId", "isRead", "timestamp"]),

    // Cath Lab Nurse Documentation tables

    cases: defineTable({
      userId: v.string(),
      caseType: v.union(
        v.literal("diagnostic_cath"),
        v.literal("pci"),
        v.literal("ep_study"),
        v.literal("structural")
      ),
      room: v.string(),
      operator: v.string(),
      nurseName: v.string(),
      status: v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("exported")
      ),
      demoMode: v.boolean(),
      completedAt: v.optional(v.number()),
    })
      .index("byUserId", ["userId"])
      .index("byStatus", ["userId", "status"]),

    events: defineTable({
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
      confirmed: v.boolean(),
      confirmedAt: v.optional(v.number()),
      confirmedBy: v.optional(v.string()),
    })
      .index("byCaseId", ["caseId", "eventTime"])
      .index("byConfirmed", ["caseId", "confirmed"]),

    snapshots: defineTable({
      caseId: v.id("cases"),
      kind: v.union(
        v.literal("hemodynamics"),
        v.literal("vitals"),
        v.literal("device_label")
      ),
      storageId: v.id("_storage"),
      ocrRaw: v.optional(v.any()),
      extractedData: v.optional(v.any()),
      confirmed: v.boolean(),
    })
      .index("byCaseId", ["caseId"]),

    devices: defineTable({
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
      confirmed: v.boolean(),
    })
      .index("byCaseId", ["caseId"]),

    exports: defineTable({
      caseId: v.id("cases"),
      kind: v.union(v.literal("plaintext"), v.literal("pdf")),
      contentText: v.string(),
      storageId: v.optional(v.id("_storage")),
      createdBy: v.string(),
    })
      .index("byCaseId", ["caseId"]),

    auditLog: defineTable({
      caseId: v.id("cases"),
      actor: v.string(),
      action: v.union(
        v.literal("create"),
        v.literal("update"),
        v.literal("confirm"),
        v.literal("delete"),
        v.literal("export"),
        v.literal("wipe")
      ),
      targetType: v.union(
        v.literal("event"),
        v.literal("snapshot"),
        v.literal("device"),
        v.literal("case"),
        v.literal("export")
      ),
      targetId: v.string(),
      beforeSnapshot: v.optional(v.any()),
      afterSnapshot: v.optional(v.any()),
      timestamp: v.number(),
    })
      .index("byCaseId", ["caseId", "timestamp"]),
  });