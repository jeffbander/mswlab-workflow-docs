"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Package, Plus, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeviceDoc {
  _id: string;
  _creationTime: number;
  type: string;
  manufacturer?: string;
  size?: string;
  lot?: string;
  expiration?: string;
  confirmed: boolean;
}

export default function DevicesPage() {
  const params = useParams();
  const caseId = params.caseId as string;

  const devices = useQuery(api.devices.list, {
    caseId: caseId as Id<"cases">,
  });
  const addDevice = useMutation(api.devices.create);
  const confirmDevice = useMutation(api.devices.confirm);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: "",
    manufacturer: "",
    size: "",
    lot: "",
    expiration: "",
  });

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm({ type: "", manufacturer: "", size: "", lot: "", expiration: "" });
  }

  async function handleAdd() {
    if (!form.type) return;
    setIsSubmitting(true);
    try {
      await addDevice({
        caseId: caseId as Id<"cases">,
        type: form.type,
        manufacturer: form.manufacturer || undefined,
        size: form.size || undefined,
        lot: form.lot || undefined,
        expiration: form.expiration || undefined,
      });
      resetForm();
      setDialogOpen(false);
    } catch (err) {
      console.error("Failed to add device:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm(deviceId: string) {
    try {
      await confirmDevice({ id: deviceId as Id<"devices"> });
    } catch (err) {
      console.error("Failed to confirm device:", err);
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-100">Devices</h2>
        <Button
          onClick={() => setDialogOpen(true)}
          className="h-11 gap-2 bg-teal-600 text-white hover:bg-teal-500"
        >
          <Plus className="size-4" />
          Add Device
        </Button>
      </div>

      {/* Loading */}
      {devices === undefined && (
        <div className="flex items-center justify-center py-16">
          <div className="size-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        </div>
      )}

      {/* Empty */}
      {devices !== undefined && devices.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 py-16">
          <Package className="mb-3 size-10 text-slate-600" />
          <p className="text-sm text-slate-400">No devices recorded yet.</p>
        </div>
      )}

      {/* Device list */}
      {devices !== undefined && devices.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {devices.map((device: DeviceDoc) => (
            <div
              key={device._id}
              className={cn(
                "rounded-lg border p-4",
                device.confirmed
                  ? "border-slate-700/50 bg-[#1E293B]"
                  : "border-amber-500/40 bg-amber-950/10"
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="size-4 text-amber-400" />
                  <span className="font-medium text-slate-200">
                    {device.type}
                  </span>
                </div>
                {device.confirmed ? (
                  <Badge className="gap-1 border-0 bg-green-600/20 text-green-400 text-xs">
                    <CheckCircle className="size-3" />
                    Confirmed
                  </Badge>
                ) : (
                  <Badge className="gap-1 border-0 bg-amber-600/20 text-amber-400 text-xs">
                    <AlertTriangle className="size-3" />
                    Unconfirmed
                  </Badge>
                )}
              </div>

              <div className="space-y-1 font-mono text-sm">
                {device.manufacturer && (
                  <div>
                    <span className="text-slate-500">Manufacturer:</span>{" "}
                    <span className="text-slate-300">{device.manufacturer}</span>
                  </div>
                )}
                {device.size && (
                  <div>
                    <span className="text-slate-500">Size:</span>{" "}
                    <span className="text-slate-300">{device.size}</span>
                  </div>
                )}
                {device.lot && (
                  <div>
                    <span className="text-slate-500">Lot:</span>{" "}
                    <span className="text-slate-300">{device.lot}</span>
                  </div>
                )}
                {device.expiration && (
                  <div>
                    <span className="text-slate-500">Exp:</span>{" "}
                    <span className="text-slate-300">{device.expiration}</span>
                  </div>
                )}
              </div>

              {!device.confirmed && (
                <Button
                  onClick={() => handleConfirm(device._id)}
                  className="mt-3 h-9 w-full gap-1.5 bg-green-600/80 text-white hover:bg-green-500"
                  size="sm"
                >
                  <CheckCircle className="size-3" />
                  Confirm Device
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add device dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-slate-700 bg-[#1E293B] text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Add Device</DialogTitle>
            <DialogDescription className="text-slate-400">
              Record a new device used in this case.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">
                Type <span className="text-red-400">*</span>
              </Label>
              <Input
                value={form.type}
                onChange={(e) => updateForm("type", e.target.value)}
                placeholder="e.g., Drug-Eluting Stent"
                className="h-11 border-slate-600 bg-[#0F172A] font-mono text-slate-200 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Manufacturer</Label>
              <Input
                value={form.manufacturer}
                onChange={(e) => updateForm("manufacturer", e.target.value)}
                placeholder="e.g., Abbott"
                className="h-11 border-slate-600 bg-[#0F172A] text-slate-200 placeholder:text-slate-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Size</Label>
                <Input
                  value={form.size}
                  onChange={(e) => updateForm("size", e.target.value)}
                  placeholder="e.g., 3.0 x 18mm"
                  className="h-11 border-slate-600 bg-[#0F172A] font-mono text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Lot #</Label>
                <Input
                  value={form.lot}
                  onChange={(e) => updateForm("lot", e.target.value)}
                  placeholder="Lot number"
                  className="h-11 border-slate-600 bg-[#0F172A] font-mono text-slate-200 placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Expiration</Label>
              <Input
                value={form.expiration}
                onChange={(e) => updateForm("expiration", e.target.value)}
                placeholder="MM/YYYY"
                className="h-11 border-slate-600 bg-[#0F172A] font-mono text-slate-200 placeholder:text-slate-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setDialogOpen(false);
              }}
              className="h-11 border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!form.type || isSubmitting}
              className="h-11 gap-1.5 bg-teal-600 text-white hover:bg-teal-500"
            >
              <Plus className="size-4" />
              {isSubmitting ? "Adding..." : "Add Device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
