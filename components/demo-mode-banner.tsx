"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useMutation } from "convex/react";

export function DemoModeBanner() {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || true; // default ON for MVP
  const [showConfirm, setShowConfirm] = useState(false);

  if (!demoMode) return null;

  return (
    <div className="bg-amber-200 text-amber-900 px-4 py-2 flex items-center justify-between text-sm font-medium sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>DEMO MODE — No real patient data</span>
      </div>
    </div>
  );
}
