"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NotePage() {
  const params = useParams();
  const caseId = params.caseId as string;

  const unconfirmedCount = useQuery(api.events.countUnconfirmed, {
    caseId: caseId as Id<"cases">,
  });

  const caseDoc = useQuery(api.cases.get, {
    id: caseId as Id<"cases">,
  });

  const generateNote = useMutation(api.cases.generateNote);

  const [noteText, setNoteText] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const result = await generateNote({
        caseId: caseId as Id<"cases">,
      });
      setNoteText(typeof result === "string" ? result : JSON.stringify(result, null, 2));
    } catch (err) {
      console.error("Failed to generate note:", err);
      setNoteText("Error generating note. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  const hasUnconfirmed =
    unconfirmedCount !== undefined && unconfirmedCount > 0;

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-100">Procedure Note</h2>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="h-11 gap-2 bg-teal-600 text-white hover:bg-teal-500"
        >
          {isGenerating ? (
            <RefreshCw className="size-4 animate-spin" />
          ) : (
            <FileText className="size-4" />
          )}
          {isGenerating ? "Generating..." : noteText ? "Regenerate Note" : "Generate Note"}
        </Button>
      </div>

      {/* Unconfirmed warning */}
      {hasUnconfirmed && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-950/20 p-3">
          <AlertTriangle className="size-5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-300">
              Unconfirmed Events Detected
            </p>
            <p className="text-xs text-amber-400/80">
              There {unconfirmedCount === 1 ? "is" : "are"}{" "}
              <span className="font-mono font-bold">{unconfirmedCount}</span>{" "}
              unconfirmed event{unconfirmedCount !== 1 ? "s" : ""}. Review them
              in the Timeline before generating a final note.
            </p>
          </div>
          <Badge className="ml-auto shrink-0 border-0 bg-red-500/20 text-red-400 text-xs tabular-nums">
            {unconfirmedCount}
          </Badge>
        </div>
      )}

      {/* Note content */}
      {noteText ? (
        <div className="rounded-xl border border-slate-700/50 bg-[#0F172A] p-6">
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-200">
            {noteText}
          </pre>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 py-20">
          <FileText className="mb-3 size-12 text-slate-600" />
          <h3 className="text-base font-medium text-slate-300">
            No note generated yet
          </h3>
          <p className="mb-4 max-w-sm text-center text-sm text-slate-500">
            Click &quot;Generate Note&quot; to create a structured procedure note
            from the timeline events.
          </p>
        </div>
      )}
    </div>
  );
}
