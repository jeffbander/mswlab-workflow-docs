"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Syringe,
  Target,
  Activity,
  HeartPulse,
  Cpu,
  ShieldCheck,
  BrainCircuit,
  AlertTriangle,
  MessageSquare,
  Clock,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EVENT_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  med_admin: {
    label: "Medication",
    icon: <Syringe className="size-4" />,
    color: "text-blue-400",
  },
  access: {
    label: "Access",
    icon: <Target className="size-4" />,
    color: "text-rose-400",
  },
  hemodynamics_snapshot: {
    label: "Hemodynamics",
    icon: <Activity className="size-4" />,
    color: "text-emerald-400",
  },
  vitals_snapshot: {
    label: "Vitals",
    icon: <HeartPulse className="size-4" />,
    color: "text-pink-400",
  },
  device_implant: {
    label: "Device",
    icon: <Cpu className="size-4" />,
    color: "text-amber-400",
  },
  timeout: {
    label: "Timeout",
    icon: <ShieldCheck className="size-4" />,
    color: "text-green-400",
  },
  sedation_check: {
    label: "Sedation",
    icon: <BrainCircuit className="size-4" />,
    color: "text-violet-400",
  },
  complication: {
    label: "Complication",
    icon: <AlertTriangle className="size-4" />,
    color: "text-red-400",
  },
  free_text: {
    label: "Note",
    icon: <MessageSquare className="size-4" />,
    color: "text-slate-400",
  },
  phase_marker: {
    label: "Phase",
    icon: <Clock className="size-4" />,
    color: "text-teal-400",
  },
};

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  manual: { label: "Manual", color: "bg-green-600/20 text-green-400 border-green-500/30" },
  ocr: { label: "OCR", color: "bg-amber-600/20 text-amber-400 border-amber-500/30" },
  asr: { label: "Voice", color: "bg-blue-600/20 text-blue-400 border-blue-500/30" },
};

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function renderPayload(eventType: string, payload: Record<string, unknown>) {
  if (!payload) return null;

  switch (eventType) {
    case "med_admin":
      return (
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm">
          {!!payload.medication && <span><span className="text-slate-500">Med:</span> {String(payload.medication)}</span>}
          {!!payload.dose && <span><span className="text-slate-500">Dose:</span> {String(payload.dose)}</span>}
          {!!payload.route && <span><span className="text-slate-500">Route:</span> {String(payload.route)}</span>}
        </div>
      );
    case "access":
      return (
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm">
          {!!payload.site && <span><span className="text-slate-500">Site:</span> {String(payload.site)}</span>}
          {!!payload.size && <span><span className="text-slate-500">Size:</span> {String(payload.size)}</span>}
          {!!payload.method && <span><span className="text-slate-500">Method:</span> {String(payload.method)}</span>}
        </div>
      );
    case "hemodynamics_snapshot":
      return (
        <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-sm">
          {["AO", "LV", "RA", "RV", "PA", "PCWP"].map(
            (key) =>
              payload[key] != null && (
                <span key={key}>
                  <span className="text-slate-500">{key}:</span>{" "}
                  <span className="text-emerald-300">{String(payload[key])}</span>
                </span>
              )
          )}
        </div>
      );
    case "vitals_snapshot":
      return (
        <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-sm">
          {payload.HR != null && <span><span className="text-slate-500">HR:</span> <span className="text-pink-300">{String(payload.HR)}</span></span>}
          {payload.BP != null && <span><span className="text-slate-500">BP:</span> <span className="text-pink-300">{String(payload.BP)}</span></span>}
          {payload.SpO2 != null && <span><span className="text-slate-500">SpO2:</span> <span className="text-pink-300">{String(payload.SpO2)}%</span></span>}
          {payload.RR != null && <span><span className="text-slate-500">RR:</span> <span className="text-pink-300">{String(payload.RR)}</span></span>}
        </div>
      );
    case "device_implant":
      return (
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm">
          {!!payload.type && <span><span className="text-slate-500">Type:</span> {String(payload.type)}</span>}
          {!!payload.manufacturer && <span><span className="text-slate-500">Mfr:</span> {String(payload.manufacturer)}</span>}
          {!!payload.size && <span><span className="text-slate-500">Size:</span> {String(payload.size)}</span>}
          {!!payload.lot && <span><span className="text-slate-500">Lot:</span> {String(payload.lot)}</span>}
        </div>
      );
    case "timeout":
      return (
        <div className="text-sm">
          <span className={payload.verified ? "text-green-400" : "text-red-400"}>
            {payload.verified ? "Verified" : "Not Verified"}
          </span>
        </div>
      );
    case "sedation_check":
      return (
        <div className="flex gap-x-4 font-mono text-sm">
          {!!payload.level && <span><span className="text-slate-500">Level:</span> {String(payload.level)}</span>}
          {payload.score != null && <span><span className="text-slate-500">Score:</span> {String(payload.score)}</span>}
        </div>
      );
    case "complication":
      return (
        <div className="text-sm">
          {!!payload.description && <span>{String(payload.description)}</span>}
          {!!payload.severity && (
            <Badge className="ml-2 border-0 bg-red-600/20 text-red-400 text-xs">
              {String(payload.severity)}
            </Badge>
          )}
        </div>
      );
    case "free_text":
      return <p className="text-sm text-slate-300">{String(payload.text ?? payload.content ?? "")}</p>;
    case "phase_marker":
      return <p className="text-sm font-semibold text-teal-300">{String(payload.phase ?? payload.name ?? "")}</p>;
    default:
      return (
        <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap">
          {JSON.stringify(payload, null, 2)}
        </pre>
      );
  }
}

interface EventDoc {
  _id: string;
  _creationTime: number;
  eventType: string;
  payload: Record<string, unknown>;
  source: string;
  confidence?: number;
  confirmed: boolean;
  timestamp?: number;
}

export default function TimelinePage() {
  const params = useParams();
  const caseId = params.caseId as string;

  const events = useQuery(api.events.list, {
    caseId: caseId as Id<"cases">,
  });

  const confirmEvent = useMutation(api.events.confirm);
  const removeEvent = useMutation(api.events.remove);

  const [reviewEvent, setReviewEvent] = useState<EventDoc | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    if (!reviewEvent) return;
    setIsConfirming(true);
    try {
      await confirmEvent({ id: reviewEvent._id as Id<"events"> });
      setReviewEvent(null);
    } catch (err) {
      console.error("Failed to confirm event:", err);
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleDelete() {
    if (!reviewEvent) return;
    setIsDeleting(true);
    try {
      await removeEvent({ id: reviewEvent._id as Id<"events"> });
      setReviewEvent(null);
    } catch (err) {
      console.error("Failed to delete event:", err);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-100">Timeline</h2>
        {events && (
          <span className="text-sm text-slate-400">
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Loading */}
      {events === undefined && (
        <div className="flex items-center justify-center py-16">
          <div className="size-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        </div>
      )}

      {/* Empty */}
      {events !== undefined && events.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 py-16">
          <Clock className="mb-3 size-10 text-slate-600" />
          <p className="text-sm text-slate-400">
            No events recorded yet. Use the Capture tab to add events.
          </p>
        </div>
      )}

      {/* Event list */}
      {events !== undefined && events.length > 0 && (
        <div className="space-y-2">
          {events.map((event: EventDoc) => {
            const config = EVENT_TYPE_CONFIG[event.eventType] ?? {
              label: event.eventType,
              icon: <MessageSquare className="size-4" />,
              color: "text-slate-400",
            };
            const sourceCfg = SOURCE_CONFIG[event.source] ?? SOURCE_CONFIG.manual;
            const eventTime = event.timestamp ?? event._creationTime;

            return (
              <div
                key={event._id}
                onClick={() => !event.confirmed && setReviewEvent(event)}
                className={cn(
                  "flex items-start gap-4 rounded-lg border p-3 transition-colors",
                  event.confirmed
                    ? "border-slate-700/50 bg-[#1E293B]"
                    : "cursor-pointer border-amber-500/40 bg-amber-950/10 hover:border-amber-500/60",
                )}
              >
                {/* Time + icon */}
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <span className="font-mono text-xs text-slate-500">
                    {formatTime(eventTime)}
                  </span>
                  <div className={cn("rounded-md bg-slate-800 p-1.5", config.color)}>
                    {config.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className={cn("text-sm font-medium", config.color)}>
                      {config.label}
                    </span>
                  </div>
                  <div className="text-slate-300">
                    {renderPayload(event.eventType, event.payload)}
                  </div>
                </div>

                {/* Meta: source, confidence, confirmed */}
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge className={cn("border text-xs", sourceCfg.color)}>
                    {sourceCfg.label}
                  </Badge>
                  {event.confidence != null && (
                    <span className="font-mono text-xs text-slate-500">
                      {Math.round(event.confidence * 100)}%
                    </span>
                  )}
                  {event.confirmed ? (
                    <CheckCircle className="size-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="size-4 text-amber-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review / confirm dialog */}
      <Dialog
        open={reviewEvent !== null}
        onOpenChange={(open) => !open && setReviewEvent(null)}
      >
        <DialogContent className="border-slate-700 bg-[#1E293B] text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Review Event</DialogTitle>
            <DialogDescription className="text-slate-400">
              Review and confirm the extracted data below.
            </DialogDescription>
          </DialogHeader>

          {reviewEvent && (
            <div className="space-y-4">
              {/* Event type + source */}
              <div className="flex items-center gap-2">
                <Badge className="border bg-slate-700/50 text-slate-300 border-slate-600 text-xs">
                  {EVENT_TYPE_CONFIG[reviewEvent.eventType]?.label ?? reviewEvent.eventType}
                </Badge>
                <Badge
                  className={cn(
                    "border text-xs",
                    SOURCE_CONFIG[reviewEvent.source]?.color ?? ""
                  )}
                >
                  {SOURCE_CONFIG[reviewEvent.source]?.label ?? reviewEvent.source}
                </Badge>
                {reviewEvent.confidence != null && (
                  <span className="ml-auto font-mono text-xs text-slate-500">
                    Confidence: {Math.round(reviewEvent.confidence * 100)}%
                  </span>
                )}
              </div>

              {/* Payload details */}
              <div className="rounded-lg border border-slate-600/50 bg-[#0F172A] p-4">
                {reviewEvent.payload &&
                  Object.entries(reviewEvent.payload).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between border-b border-slate-700/30 py-1.5 last:border-0"
                    >
                      <span className="text-sm text-slate-500">{key}</span>
                      <span className="font-mono text-sm text-slate-200">
                        {String(value)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-11 gap-1.5"
            >
              <Trash2 className="size-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="h-11 gap-1.5 bg-green-600 text-white hover:bg-green-500"
            >
              <CheckCircle className="size-4" />
              {isConfirming ? "Confirming..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
