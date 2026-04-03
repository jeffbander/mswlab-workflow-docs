"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const CASE_TYPES = [
  { value: "diagnostic_cath", label: "Diagnostic Catheterization" },
  { value: "pci", label: "PCI" },
  { value: "ep_study", label: "EP Study" },
  { value: "structural", label: "Structural" },
];

export default function NewCasePage() {
  const router = useRouter();
  const createCase = useMutation(api.cases.create);

  const [caseType, setCaseType] = useState("");
  const [room, setRoom] = useState("");
  const [operator, setOperator] = useState("");
  const [nurseName, setNurseName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!caseType) return;

    setIsSubmitting(true);
    try {
      const caseId = await createCase({
        caseType: caseType as "diagnostic_cath" | "pci" | "ep_study" | "structural",
        room,
        operator,
        nurseName,
      });
      router.push(`/dashboard/cases/${caseId}/timeline`);
    } catch (error) {
      console.error("Failed to create case:", error);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 lg:px-6">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
      >
        <ArrowLeft className="size-4" />
        Back to Cases
      </Link>

      <div className="rounded-xl border border-slate-700/50 bg-[#1E293B] p-6">
        <h1 className="mb-1 text-xl font-bold text-slate-100">New Case</h1>
        <p className="mb-6 text-sm text-slate-400">
          Create a new catheterization lab case record.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Case Type */}
          <div className="space-y-2">
            <Label htmlFor="caseType" className="text-slate-300">
              Case Type <span className="text-red-400">*</span>
            </Label>
            <Select value={caseType} onValueChange={setCaseType}>
              <SelectTrigger className="h-11 w-full border-slate-600 bg-[#0F172A] text-slate-200">
                <SelectValue placeholder="Select case type..." />
              </SelectTrigger>
              <SelectContent className="border-slate-600 bg-[#1E293B]">
                {CASE_TYPES.map((ct) => (
                  <SelectItem
                    key={ct.value}
                    value={ct.value}
                    className="text-slate-200 focus:bg-teal-600/20 focus:text-teal-300"
                  >
                    {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Room */}
          <div className="space-y-2">
            <Label htmlFor="room" className="text-slate-300">
              Room
            </Label>
            <Input
              id="room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g., Cath Lab 1"
              className="h-11 border-slate-600 bg-[#0F172A] text-slate-200 placeholder:text-slate-500"
            />
          </div>

          {/* Operator */}
          <div className="space-y-2">
            <Label htmlFor="operator" className="text-slate-300">
              Operator
            </Label>
            <Input
              id="operator"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              placeholder="e.g., Dr. Smith"
              className="h-11 border-slate-600 bg-[#0F172A] text-slate-200 placeholder:text-slate-500"
            />
          </div>

          {/* Nurse Name */}
          <div className="space-y-2">
            <Label htmlFor="nurseName" className="text-slate-300">
              Nurse Name
            </Label>
            <Input
              id="nurseName"
              value={nurseName}
              onChange={(e) => setNurseName(e.target.value)}
              placeholder="e.g., Jane Doe, RN"
              className="h-11 border-slate-600 bg-[#0F172A] text-slate-200 placeholder:text-slate-500"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={!caseType || isSubmitting}
            className="h-11 w-full bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40"
          >
            {isSubmitting ? "Creating..." : "Create Case"}
          </Button>
        </form>
      </div>
    </div>
  );
}
