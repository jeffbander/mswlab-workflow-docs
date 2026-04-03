"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  AlertTriangle,
  CheckCircle,
  FileText,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportDoc {
  _id: string;
  _creationTime: number;
  format?: string;
  filename?: string;
}

export default function ExportPage() {
  const params = useParams();
  const caseId = params.caseId as string;

  const unconfirmedCount = useQuery(api.events.countUnconfirmed, {
    caseId: caseId as Id<"cases">,
  });

  const caseDoc = useQuery(api.cases.get, {
    id: caseId as Id<"cases">,
  });

  // Try to load previous exports if the API exists
  let exports: ExportDoc[] | undefined;
  try {
    exports = useQuery(api.exports.list, {
      caseId: caseId as Id<"cases">,
    });
  } catch {
    exports = [];
  }

  const generateNote = useMutation(api.cases.generateNote);

  const [isExporting, setIsExporting] = useState(false);

  const hasUnconfirmed =
    unconfirmedCount !== undefined && unconfirmedCount > 0;
  const allConfirmed =
    unconfirmedCount !== undefined && unconfirmedCount === 0;

  async function handleExport() {
    setIsExporting(true);
    try {
      const noteContent = await generateNote({
        caseId: caseId as Id<"cases">,
      });

      const text =
        typeof noteContent === "string"
          ? noteContent
          : JSON.stringify(noteContent, null, 2);

      // Create a downloadable file
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `procedure-note-${caseId.slice(-6)}-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-100">Export</h2>

      {/* Status check */}
      {hasUnconfirmed && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-950/20 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-6 shrink-0 text-red-400" />
            <div>
              <p className="font-medium text-red-300">
                Cannot export: unconfirmed events
              </p>
              <p className="text-sm text-red-400/80">
                There {unconfirmedCount === 1 ? "is" : "are"}{" "}
                <span className="font-mono font-bold">{unconfirmedCount}</span>{" "}
                unconfirmed event{unconfirmedCount !== 1 ? "s" : ""} remaining.
                Please review and confirm all events in the Timeline before
                exporting.
              </p>
            </div>
          </div>
        </div>
      )}

      {allConfirmed && (
        <div className="mb-6 rounded-lg border border-green-500/30 bg-green-950/20 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="size-5 shrink-0 text-green-400" />
            <p className="text-sm text-green-300">
              All events confirmed. Ready to export.
            </p>
          </div>
        </div>
      )}

      {/* Export button */}
      <div className="mb-8 rounded-xl border border-slate-700/50 bg-[#1E293B] p-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-300">
          Export Procedure Note
        </h3>
        <p className="mb-4 text-sm text-slate-500">
          Generate a structured plaintext note and download it. PDF export is
          planned for a future release.
        </p>

        <Button
          onClick={handleExport}
          disabled={hasUnconfirmed || isExporting || unconfirmedCount === undefined}
          className={cn(
            "h-12 gap-2 px-6",
            hasUnconfirmed
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-teal-600 text-white hover:bg-teal-500"
          )}
        >
          <Download className="size-5" />
          {isExporting ? "Generating..." : "Export as Text"}
        </Button>
      </div>

      {/* Previous exports */}
      {exports && exports.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
            <Clock className="size-4" />
            Previous Exports
          </h3>
          <div className="space-y-2">
            {exports.map((exp: ExportDoc) => (
              <div
                key={exp._id}
                className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-[#1E293B] p-3"
              >
                <FileText className="size-4 text-slate-500" />
                <span className="flex-1 text-sm text-slate-300">
                  {exp.filename ?? "Procedure Note"}
                </span>
                <Badge className="border-0 bg-slate-700/50 text-slate-400 text-xs">
                  {exp.format ?? "txt"}
                </Badge>
                <span className="text-xs text-slate-500">
                  {new Date(exp._creationTime).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
