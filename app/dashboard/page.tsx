"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Plus, FileText, Clock, CheckCircle, Archive } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CASE_TYPE_LABELS: Record<string, string> = {
  diagnostic_cath: "Diagnostic Cath",
  pci: "PCI",
  ep_study: "EP Study",
  structural: "Structural",
};

const CASE_TYPE_COLORS: Record<string, string> = {
  diagnostic_cath: "bg-blue-600/20 text-blue-400 border-blue-500/30",
  pci: "bg-rose-600/20 text-rose-400 border-rose-500/30",
  ep_study: "bg-violet-600/20 text-violet-400 border-violet-500/30",
  structural: "bg-amber-600/20 text-amber-400 border-amber-500/30",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: {
    label: "Active",
    color: "bg-teal-600/20 text-teal-400 border-teal-500/30",
    icon: <Clock className="size-3" />,
  },
  completed: {
    label: "Completed",
    color: "bg-green-600/20 text-green-400 border-green-500/30",
    icon: <CheckCircle className="size-3" />,
  },
  exported: {
    label: "Exported",
    color: "bg-slate-600/20 text-slate-400 border-slate-500/30",
    icon: <Archive className="size-3" />,
  },
};

interface CaseDoc {
  _id: string;
  _creationTime: number;
  caseType: string;
  room?: string;
  operator?: string;
  nurseName?: string;
  status: string;
}

export default function DashboardPage() {
  const cases = useQuery(api.cases.list);
  const router = useRouter();

  const activeCases = cases?.filter((c: CaseDoc) => c.status === "active") ?? [];
  const completedCases = cases?.filter((c: CaseDoc) => c.status === "completed") ?? [];
  const exportedCases = cases?.filter((c: CaseDoc) => c.status === "exported") ?? [];

  function CaseCard({ caseDoc }: { caseDoc: CaseDoc }) {
    const statusCfg = STATUS_CONFIG[caseDoc.status] ?? STATUS_CONFIG.active;
    const typeColor = CASE_TYPE_COLORS[caseDoc.caseType] ?? "bg-slate-600/20 text-slate-400 border-slate-500/30";
    const typeLabel = CASE_TYPE_LABELS[caseDoc.caseType] ?? caseDoc.caseType;

    return (
      <Card
        className="cursor-pointer border-slate-700/50 bg-[#1E293B] transition-colors hover:border-teal-500/40 hover:bg-[#1E293B]/80"
        onClick={() => router.push(`/dashboard/cases/${caseDoc._id}/timeline`)}
      >
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <Badge className={`${typeColor} border text-xs`}>
              {typeLabel}
            </Badge>
            <Badge className={`${statusCfg.color} border text-xs gap-1`}>
              {statusCfg.icon}
              {statusCfg.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {caseDoc.room && (
              <div>
                <span className="text-slate-500">Room:</span>{" "}
                <span className="font-mono text-slate-200">{caseDoc.room}</span>
              </div>
            )}
            {caseDoc.operator && (
              <div>
                <span className="text-slate-500">Operator:</span>{" "}
                <span className="text-slate-200">{caseDoc.operator}</span>
              </div>
            )}
            {caseDoc.nurseName && (
              <div>
                <span className="text-slate-500">Nurse:</span>{" "}
                <span className="text-slate-200">{caseDoc.nurseName}</span>
              </div>
            )}
            <div>
              <span className="text-slate-500">Started:</span>{" "}
              <span className="text-slate-400 text-xs">
                {formatDistanceToNow(new Date(caseDoc._creationTime), { addSuffix: true })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function CaseSection({
    title,
    icon,
    cases: sectionCases,
  }: {
    title: string;
    icon: React.ReactNode;
    cases: CaseDoc[];
  }) {
    if (sectionCases.length === 0) return null;
    return (
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
          {icon}
          {title}
          <Badge variant="secondary" className="ml-1 text-xs">
            {sectionCases.length}
          </Badge>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sectionCases.map((c) => (
            <CaseCard key={c._id} caseDoc={c} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Cath Lab Cases</h1>
          <p className="text-sm text-slate-400">
            Manage and document catheterization lab procedures
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/cases/new")}
          className="h-11 gap-2 bg-teal-600 px-5 text-white hover:bg-teal-500"
        >
          <Plus className="size-4" />
          New Case
        </Button>
      </div>

      {/* Loading state */}
      {cases === undefined && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto mb-3 size-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            <p className="text-sm text-slate-400">Loading cases...</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {cases !== undefined && cases.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 py-20">
          <FileText className="mb-3 size-12 text-slate-600" />
          <h3 className="text-lg font-medium text-slate-300">No cases yet</h3>
          <p className="mb-4 text-sm text-slate-500">
            Create your first case to start documenting.
          </p>
          <Button
            onClick={() => router.push("/dashboard/cases/new")}
            className="gap-2 bg-teal-600 text-white hover:bg-teal-500"
          >
            <Plus className="size-4" />
            New Case
          </Button>
        </div>
      )}

      {/* Case sections */}
      {cases !== undefined && cases.length > 0 && (
        <div className="space-y-8">
          <CaseSection title="Active" icon={<Clock className="size-4 text-teal-400" />} cases={activeCases} />
          <CaseSection title="Completed" icon={<CheckCircle className="size-4 text-green-400" />} cases={completedCases} />
          <CaseSection title="Exported" icon={<Archive className="size-4 text-slate-500" />} cases={exportedCases} />
        </div>
      )}
    </div>
  );
}
