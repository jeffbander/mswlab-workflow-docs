"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { Clock, Camera, Package, FileText, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CASE_TYPE_LABELS: Record<string, string> = {
  diagnostic_cath: "Diagnostic Cath",
  pci: "PCI",
  ep_study: "EP Study",
  structural: "Structural",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-teal-600/20 text-teal-400 border-teal-500/30",
  completed: "bg-green-600/20 text-green-400 border-green-500/30",
  exported: "bg-slate-600/20 text-slate-400 border-slate-500/30",
};

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  segment: string;
}

export default function CaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const caseId = params.caseId as string;

  const caseDoc = useQuery(api.cases.get, {
    caseId: caseId as Id<"cases">,
  });

  const unconfirmedCount = useQuery(api.events.countUnconfirmed, {
    caseId: caseId as Id<"cases">,
  });

  const navItems: NavItem[] = [
    {
      label: "Timeline",
      href: `/dashboard/cases/${caseId}/timeline`,
      icon: <Clock className="size-4" />,
      segment: "timeline",
    },
    {
      label: "Capture",
      href: `/dashboard/cases/${caseId}/capture`,
      icon: <Camera className="size-4" />,
      segment: "capture",
    },
    {
      label: "Devices",
      href: `/dashboard/cases/${caseId}/devices`,
      icon: <Package className="size-4" />,
      segment: "devices",
    },
    {
      label: "Note",
      href: `/dashboard/cases/${caseId}/note`,
      icon: <FileText className="size-4" />,
      segment: "note",
    },
    {
      label: "Export",
      href: `/dashboard/cases/${caseId}/export`,
      icon: <Download className="size-4" />,
      segment: "export",
    },
  ];

  function isActive(segment: string) {
    return pathname.endsWith(`/${segment}`);
  }

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* Case sidebar */}
      <div className="flex w-[280px] shrink-0 flex-col border-r border-slate-700/50 bg-[#0F172A]">
        {/* Case metadata */}
        <div className="border-b border-slate-700/50 p-4">
          <Link
            href="/dashboard"
            className="mb-3 inline-block text-xs text-slate-500 transition-colors hover:text-slate-300"
          >
            &larr; All Cases
          </Link>

          {caseDoc ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="border bg-teal-600/20 text-teal-400 border-teal-500/30 text-xs">
                  {CASE_TYPE_LABELS[caseDoc.caseType] ?? caseDoc.caseType}
                </Badge>
              </div>
              <div className="space-y-1 text-sm">
                {caseDoc.room && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Room</span>
                    <span className="font-mono text-slate-200">{caseDoc.room}</span>
                  </div>
                )}
                {caseDoc.operator && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Operator</span>
                    <span className="text-slate-200">{caseDoc.operator}</span>
                  </div>
                )}
                {caseDoc.nurseName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nurse</span>
                    <span className="text-slate-200">{caseDoc.nurseName}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="h-5 w-24 animate-pulse rounded bg-slate-700" />
              <div className="h-4 w-32 animate-pulse rounded bg-slate-700" />
              <div className="h-4 w-28 animate-pulse rounded bg-slate-700" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.segment);
              return (
                <li key={item.segment}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-teal-600/15 text-teal-400"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.segment === "timeline" &&
                      unconfirmedCount !== undefined &&
                      unconfirmedCount > 0 && (
                        <Badge className="ml-auto border-0 bg-red-500/20 text-red-400 text-xs tabular-nums">
                          {unconfirmedCount}
                        </Badge>
                      )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Status footer */}
        <div className="border-t border-slate-700/50 p-4">
          {caseDoc && (
            <Badge
              className={cn(
                "border text-xs",
                STATUS_COLORS[caseDoc.status] ?? STATUS_COLORS.active
              )}
            >
              {caseDoc.status?.charAt(0).toUpperCase() + caseDoc.status?.slice(1)}
            </Badge>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
