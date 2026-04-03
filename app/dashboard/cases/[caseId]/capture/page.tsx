"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, MicOff, Camera, PenLine, Upload, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// Web Speech API types (not available in all TS lib targets)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

// ── Event types ──────────────────────────────────────────────
const EVENT_TYPES = [
  { value: "med_admin", label: "Medication Administration" },
  { value: "access", label: "Access" },
  { value: "hemodynamics_snapshot", label: "Hemodynamics Snapshot" },
  { value: "vitals_snapshot", label: "Vitals Snapshot" },
  { value: "device_implant", label: "Device Implant" },
  { value: "timeout", label: "Timeout" },
  { value: "sedation_check", label: "Sedation Check" },
  { value: "complication", label: "Complication" },
  { value: "free_text", label: "Free Text" },
  { value: "phase_marker", label: "Phase Marker" },
];

const SNAPSHOT_TYPES = [
  { value: "hemodynamics", label: "Hemodynamics" },
  { value: "vitals", label: "Vitals" },
  { value: "device_label", label: "Device Label" },
];

// ── Keyword parser for voice ─────────────────────────────────
function parseTranscript(text: string): { eventType: string; payload: Record<string, string> } {
  const lower = text.toLowerCase();
  if (lower.includes("heparin") || lower.includes("medication") || lower.includes("drug") || lower.includes("dose")) {
    return { eventType: "med_admin", payload: { medication: text } };
  }
  if (lower.includes("access") || lower.includes("sheath") || lower.includes("puncture")) {
    return { eventType: "access", payload: { site: text } };
  }
  if (lower.includes("pressure") || lower.includes("hemodynamic")) {
    return { eventType: "hemodynamics_snapshot", payload: { notes: text } };
  }
  if (lower.includes("vitals") || lower.includes("heart rate") || lower.includes("blood pressure")) {
    return { eventType: "vitals_snapshot", payload: { notes: text } };
  }
  if (lower.includes("device") || lower.includes("stent") || lower.includes("implant")) {
    return { eventType: "device_implant", payload: { type: text } };
  }
  if (lower.includes("timeout")) {
    return { eventType: "timeout", payload: { verified: "true" } };
  }
  if (lower.includes("sedation")) {
    return { eventType: "sedation_check", payload: { level: text } };
  }
  if (lower.includes("complication") || lower.includes("bleed") || lower.includes("adverse")) {
    return { eventType: "complication", payload: { description: text } };
  }
  return { eventType: "free_text", payload: { text } };
}

// ══════════════════════════════════════════════════════════════
// Voice Tab
// ══════════════════════════════════════════════════════════════
function VoiceTab({ caseId }: { caseId: string }) {
  const createEvent = useMutation(api.events.create);
  const router = useRouter();

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState<{ eventType: string; payload: Record<string, string> } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startRecording = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }
      setTranscript(finalTranscript);
    };

    recognition.onerror = (event: Event) => {
      console.error("Speech recognition error:", event);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setTranscript("");
    setParsed(null);
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    // Parse the transcript after stopping
    if (transcript) {
      setParsed(parseTranscript(transcript));
    }
  }, [transcript]);

  async function handleAddToTimeline() {
    if (!parsed) return;
    setIsAdding(true);
    try {
      await createEvent({
        caseId: caseId as Id<"cases">,
        eventType: parsed.eventType,
        payload: parsed.payload,
        source: "asr",
        confirmed: false,
      });
      setTranscript("");
      setParsed(null);
      router.push(`/dashboard/cases/${caseId}/timeline`);
    } catch (err) {
      console.error("Failed to add event:", err);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Mic button */}
      <button
        onPointerDown={startRecording}
        onPointerUp={stopRecording}
        onPointerLeave={() => isRecording && stopRecording()}
        className={cn(
          "flex size-20 items-center justify-center rounded-full transition-all",
          isRecording
            ? "scale-110 bg-red-500 shadow-lg shadow-red-500/30"
            : "bg-teal-600 hover:bg-teal-500 active:scale-95"
        )}
      >
        {isRecording ? (
          <MicOff className="size-8 text-white" />
        ) : (
          <Mic className="size-8 text-white" />
        )}
      </button>

      <p className="text-sm text-slate-400">
        {isRecording
          ? "Recording... Release to stop."
          : "Press and hold to record"}
      </p>

      {/* Transcript */}
      {transcript && (
        <div className="w-full max-w-md rounded-lg border border-slate-700/50 bg-[#0F172A] p-4">
          <Label className="mb-2 text-slate-500">Transcript</Label>
          <p className="text-sm text-slate-200">{transcript}</p>
        </div>
      )}

      {/* Parsed result */}
      {parsed && (
        <div className="w-full max-w-md space-y-3">
          <div className="rounded-lg border border-slate-700/50 bg-[#0F172A] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Label className="text-slate-500">Detected Type</Label>
              <Badge className="border-0 bg-blue-600/20 text-blue-400 text-xs">
                {EVENT_TYPES.find((t) => t.value === parsed.eventType)?.label ?? parsed.eventType}
              </Badge>
            </div>
            <div className="space-y-1 font-mono text-sm">
              {Object.entries(parsed.payload).map(([key, value]) => (
                <div key={key}>
                  <span className="text-slate-500">{key}:</span>{" "}
                  <span className="text-slate-200">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleAddToTimeline}
            disabled={isAdding}
            className="h-11 w-full gap-2 bg-teal-600 text-white hover:bg-teal-500"
          >
            <Plus className="size-4" />
            {isAdding ? "Adding..." : "Add to Timeline"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// OCR Tab
// ══════════════════════════════════════════════════════════════
function OcrTab({ caseId }: { caseId: string }) {
  const generateUploadUrl = useMutation(api.snapshots.generateUploadUrl);
  const createSnapshot = useMutation(api.snapshots.create);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [snapshotType, setSnapshotType] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setUploaded(false);
    if (selected) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  }

  async function handleUpload() {
    if (!file || !snapshotType) return;
    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await response.json();

      await createSnapshot({
        caseId: caseId as Id<"cases">,
        storageId,
        snapshotType,
        filename: file.name,
      });

      setUploaded(true);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5 py-6">
      {/* Snapshot type */}
      <div className="space-y-2">
        <Label className="text-slate-300">Snapshot Type</Label>
        <Select value={snapshotType} onValueChange={setSnapshotType}>
          <SelectTrigger className="h-11 w-full border-slate-600 bg-[#0F172A] text-slate-200">
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent className="border-slate-600 bg-[#1E293B]">
            {SNAPSHOT_TYPES.map((st) => (
              <SelectItem
                key={st.value}
                value={st.value}
                className="text-slate-200 focus:bg-teal-600/20 focus:text-teal-300"
              >
                {st.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* File upload */}
      <div className="space-y-2">
        <Label className="text-slate-300">Image</Label>
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="h-11 border-slate-600 bg-[#0F172A] text-slate-200 file:text-slate-400"
        />
      </div>

      {/* Preview */}
      {preview && (
        <div className="overflow-hidden rounded-lg border border-slate-700/50">
          <img
            src={preview}
            alt="Snapshot preview"
            className="max-h-64 w-full object-contain bg-black/20"
          />
        </div>
      )}

      {/* Upload button */}
      <Button
        onClick={handleUpload}
        disabled={!file || !snapshotType || isUploading}
        className="h-11 w-full gap-2 bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40"
      >
        <Upload className="size-4" />
        {isUploading ? "Uploading..." : "Upload Snapshot"}
      </Button>

      {/* Success / processing */}
      {uploaded && (
        <div className="rounded-lg border border-teal-500/30 bg-teal-600/10 p-3 text-center text-sm text-teal-300">
          Snapshot uploaded. OCR processing will happen in Phase 2.
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Manual Entry Tab
// ══════════════════════════════════════════════════════════════

function ManualEntryTab({ caseId }: { caseId: string }) {
  const createEvent = useMutation(api.events.create);
  const router = useRouter();

  const [eventType, setEventType] = useState("");
  const [payload, setPayload] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updatePayload(key: string, value: string) {
    setPayload((prev) => ({ ...prev, [key]: value }));
  }

  function updatePayloadBool(key: string, value: boolean) {
    setPayload((prev) => ({ ...prev, [key]: String(value) }));
  }

  async function handleSubmit() {
    if (!eventType) return;
    setIsSubmitting(true);
    try {
      await createEvent({
        caseId: caseId as Id<"cases">,
        eventType,
        payload,
        source: "manual",
        confirmed: true,
      });
      setEventType("");
      setPayload({});
      router.push(`/dashboard/cases/${caseId}/timeline`);
    } catch (err) {
      console.error("Failed to add event:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  function PayloadField({
    label,
    field,
    placeholder,
  }: {
    label: string;
    field: string;
    placeholder?: string;
  }) {
    return (
      <div className="space-y-1.5">
        <Label className="text-slate-400 text-xs">{label}</Label>
        <Input
          value={payload[field] ?? ""}
          onChange={(e) => updatePayload(field, e.target.value)}
          placeholder={placeholder}
          className="h-11 border-slate-600 bg-[#0F172A] font-mono text-slate-200 placeholder:text-slate-500"
        />
      </div>
    );
  }

  function renderPayloadFields() {
    switch (eventType) {
      case "med_admin":
        return (
          <div className="grid grid-cols-2 gap-3">
            <PayloadField label="Medication" field="medication" placeholder="e.g., Heparin" />
            <PayloadField label="Dose" field="dose" placeholder="e.g., 5000 units" />
            <PayloadField label="Route" field="route" placeholder="e.g., IV" />
            <PayloadField label="Time" field="time" placeholder="HH:MM" />
          </div>
        );
      case "access":
        return (
          <div className="grid grid-cols-3 gap-3">
            <PayloadField label="Site" field="site" placeholder="e.g., Right femoral" />
            <PayloadField label="Size" field="size" placeholder="e.g., 6F" />
            <PayloadField label="Method" field="method" placeholder="e.g., Seldinger" />
          </div>
        );
      case "hemodynamics_snapshot":
        return (
          <div className="grid grid-cols-3 gap-3">
            <PayloadField label="AO" field="AO" placeholder="mmHg" />
            <PayloadField label="LV" field="LV" placeholder="mmHg" />
            <PayloadField label="RA" field="RA" placeholder="mmHg" />
            <PayloadField label="RV" field="RV" placeholder="mmHg" />
            <PayloadField label="PA" field="PA" placeholder="mmHg" />
            <PayloadField label="PCWP" field="PCWP" placeholder="mmHg" />
          </div>
        );
      case "vitals_snapshot":
        return (
          <div className="grid grid-cols-2 gap-3">
            <PayloadField label="HR" field="HR" placeholder="bpm" />
            <PayloadField label="BP" field="BP" placeholder="e.g., 120/80" />
            <PayloadField label="SpO2" field="SpO2" placeholder="%" />
            <PayloadField label="RR" field="RR" placeholder="breaths/min" />
          </div>
        );
      case "device_implant":
        return (
          <div className="grid grid-cols-2 gap-3">
            <PayloadField label="Type" field="type" placeholder="e.g., DES" />
            <PayloadField label="Manufacturer" field="manufacturer" placeholder="e.g., Abbott" />
            <PayloadField label="Size" field="size" placeholder="e.g., 3.0 x 18mm" />
            <PayloadField label="Lot #" field="lot" placeholder="Lot number" />
            <PayloadField label="Expiration" field="expiration" placeholder="MM/YYYY" />
          </div>
        );
      case "timeout":
        return (
          <div className="flex items-center gap-3 py-2">
            <Checkbox
              id="timeout-verified"
              checked={payload.verified === "true"}
              onCheckedChange={(checked) => updatePayloadBool("verified", !!checked)}
              className="border-slate-500 data-[state=checked]:bg-teal-600"
            />
            <Label htmlFor="timeout-verified" className="text-slate-300">
              Timeout verified
            </Label>
          </div>
        );
      case "sedation_check":
        return (
          <div className="grid grid-cols-2 gap-3">
            <PayloadField label="Level" field="level" placeholder="e.g., Moderate" />
            <PayloadField label="Score" field="score" placeholder="e.g., 3" />
          </div>
        );
      case "complication":
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Description</Label>
              <textarea
                value={payload.description ?? ""}
                onChange={(e) => updatePayload("description", e.target.value)}
                placeholder="Describe the complication..."
                rows={3}
                className="w-full rounded-md border border-slate-600 bg-[#0F172A] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-teal-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Severity</Label>
              <Select
                value={payload.severity ?? ""}
                onValueChange={(v) => updatePayload("severity", v)}
              >
                <SelectTrigger className="h-11 w-full border-slate-600 bg-[#0F172A] text-slate-200">
                  <SelectValue placeholder="Select severity..." />
                </SelectTrigger>
                <SelectContent className="border-slate-600 bg-[#1E293B]">
                  <SelectItem value="minor" className="text-slate-200 focus:bg-teal-600/20">Minor</SelectItem>
                  <SelectItem value="moderate" className="text-slate-200 focus:bg-teal-600/20">Moderate</SelectItem>
                  <SelectItem value="major" className="text-slate-200 focus:bg-teal-600/20">Major</SelectItem>
                  <SelectItem value="life_threatening" className="text-slate-200 focus:bg-teal-600/20">Life-threatening</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "free_text":
        return (
          <div className="space-y-1.5">
            <Label className="text-slate-400 text-xs">Text</Label>
            <textarea
              value={payload.text ?? ""}
              onChange={(e) => updatePayload("text", e.target.value)}
              placeholder="Enter free text note..."
              rows={4}
              className="w-full rounded-md border border-slate-600 bg-[#0F172A] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-teal-500"
            />
          </div>
        );
      case "phase_marker":
        return (
          <PayloadField label="Phase Name" field="phase" placeholder="e.g., Arterial access obtained" />
        );
      default:
        return null;
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 py-6">
      {/* Event type selector */}
      <div className="space-y-2">
        <Label className="text-slate-300">Event Type</Label>
        <Select
          value={eventType}
          onValueChange={(v) => {
            setEventType(v);
            setPayload({});
          }}
        >
          <SelectTrigger className="h-11 w-full border-slate-600 bg-[#0F172A] text-slate-200">
            <SelectValue placeholder="Select event type..." />
          </SelectTrigger>
          <SelectContent className="border-slate-600 bg-[#1E293B]">
            {EVENT_TYPES.map((et) => (
              <SelectItem
                key={et.value}
                value={et.value}
                className="text-slate-200 focus:bg-teal-600/20 focus:text-teal-300"
              >
                {et.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dynamic payload fields */}
      {eventType && (
        <div className="rounded-lg border border-slate-700/50 bg-[#1E293B] p-4">
          {renderPayloadFields()}
        </div>
      )}

      {/* Submit */}
      {eventType && (
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="h-11 w-full gap-2 bg-teal-600 text-white hover:bg-teal-500"
        >
          <Plus className="size-4" />
          {isSubmitting ? "Adding..." : "Add Event"}
        </Button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════
export default function CapturePage() {
  const params = useParams();
  const caseId = params.caseId as string;

  return (
    <div className="p-4 lg:p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-100">Capture Event</h2>

      <Tabs defaultValue="voice" className="w-full">
        <TabsList className="mb-4 w-full bg-[#0F172A]">
          <TabsTrigger value="voice" className="flex-1 gap-1.5 data-[state=active]:bg-teal-600/15 data-[state=active]:text-teal-400">
            <Mic className="size-4" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="ocr" className="flex-1 gap-1.5 data-[state=active]:bg-teal-600/15 data-[state=active]:text-teal-400">
            <Camera className="size-4" />
            OCR Snapshot
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex-1 gap-1.5 data-[state=active]:bg-teal-600/15 data-[state=active]:text-teal-400">
            <PenLine className="size-4" />
            Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="voice">
          <VoiceTab caseId={caseId} />
        </TabsContent>
        <TabsContent value="ocr">
          <OcrTab caseId={caseId} />
        </TabsContent>
        <TabsContent value="manual">
          <ManualEntryTab caseId={caseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
