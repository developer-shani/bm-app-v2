"use client";
export const dynamic = "force-dynamic";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Settings as SettingsIcon,
  Building2,
  Upload,
  MessageSquare,
  Save,
  Trash2,
  ShieldAlert,
  Lock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Database,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

interface CollectionResetOption {
  id: string;
  name: string;
  description: string;
  collectionName: string;
}

const RESET_OPTIONS: CollectionResetOption[] = [
  { id: "customers", name: "Customers & Sales Accounts", description: "All active & completed installment customer records", collectionName: "customers" },
  { id: "recoveries", name: "Recoveries & Payments", description: "All collection payments & installment transaction logs", collectionName: "recoveries" },
  { id: "investors", name: "Investors & Capital Accounts", description: "All investor profiles, share percentages & ledgers", collectionName: "investors" },
  { id: "investments", name: "Investment & Deposit Logs", description: "All capital deposit transaction history", collectionName: "investments" },
  { id: "withdrawals", name: "Withdrawal Requests & Logs", description: "All investor profit/capital payout logs", collectionName: "withdrawals" },
  { id: "resellers", name: "Resellers & Agents", description: "All reseller profiles & commission records", collectionName: "resellers" },
  { id: "pending_approvals", name: "Pending Approvals", description: "Unapproved sales & withdrawal requests", collectionName: "pending_approvals" },
  { id: "deleted_records", name: "Trash & Soft-deleted Records", description: "Recycle bin history", collectionName: "deleted_records" },
  { id: "notifications", name: "System Notifications", description: "All alert notifications", collectionName: "notifications" },
];

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState("Brother Mobiles");
  const [defaultExpense, setDefaultExpense] = useState("2000");
  const [defaultCommission, setDefaultCommission] = useState("2");
  const [maxInstallments, setMaxInstallments] = useState("9");
  const [secretPin, setSecretPin] = useState("8208");
  const [smsTemplate, setSmsTemplate] = useState(
    `Assalam o Alaikum {customerName},\n\nAapki installment #{installmentNumber}/{totalInstallments} ki payment Rs. {pendingAmount} ki due date {dueDate} hai.\n\nShukriya,\n{companyName}`
  );

  // Reset Modal state
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [selectedCollections, setSelectedCollections] = useState<string[]>(
    RESET_OPTIONS.map((o) => o.id)
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState("");

  const handleSave = () => {
    toast.success("Settings saved successfully!");
  };

  const toggleCollection = (id: string) => {
    setSelectedCollections((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllCollections = () => {
    setSelectedCollections(RESET_OPTIONS.map((o) => o.id));
  };

  const deselectAllCollections = () => {
    setSelectedCollections([]);
  };

  // Perform wipe of selected Firestore collections
  const handleSystemReset = async () => {
    if (enteredPin.trim() !== secretPin.trim()) {
      toast.error("Incorrect Secret PIN! Access Denied.", {
        description: "Standard PIN is 8208. Please check and try again.",
      });
      return;
    }

    if (selectedCollections.length === 0) {
      toast.error("Please select at least one data category to delete.");
      return;
    }

    setIsDeleting(true);
    const toastId = toast.loading("Initiating System Data Wipe...");

    try {
      let totalDeletedCount = 0;

      for (const targetId of selectedCollections) {
        const option = RESET_OPTIONS.find((o) => o.id === targetId);
        if (!option) continue;

        setDeleteProgress(`Clearing ${option.name}...`);
        toast.loading(`Wiping ${option.name}...`, { id: toastId });

        const colRef = collection(db, option.collectionName);
        const snapshot = await getDocs(colRef);

        if (!snapshot.empty) {
          let batch = writeBatch(db);
          let count = 0;

          for (const docSnap of snapshot.docs) {
            batch.delete(doc(db, option.collectionName, docSnap.id));
            count++;
            totalDeletedCount++;

            if (count === 400) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }

          if (count > 0) {
            await batch.commit();
          }
        }
      }

      toast.success("🎉 Factory Data Reset Complete!", {
        id: toastId,
        description: `Successfully wiped ${totalDeletedCount} test record(s) from Firebase.`,
      });

      setIsResetOpen(false);
      setEnteredPin("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset system data";
      toast.error("Data Wipe Failed!", {
        id: toastId,
        description: message,
      });
    } finally {
      setIsDeleting(false);
      setDeleteProgress("");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage shop configurations, default values, SMS templates & testing options
        </p>
      </div>

      {/* Company Info */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" /> Shop Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Company / Shop Name</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Company Logo / Watermark</Label>
            <div className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center bg-muted/20">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" />
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <span>
                    <Upload className="w-3.5 h-3.5" /> Upload Shop Logo
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Values */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-emerald-600" /> Default Values & Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Default Expense (PKR)</Label>
              <Input
                type="number"
                value={defaultExpense}
                onChange={(e) => setDefaultExpense(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Commission (%)</Label>
              <Input
                type="number"
                value={defaultCommission}
                onChange={(e) => setDefaultCommission(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Installments</Label>
              <Input
                type="number"
                value={maxInstallments}
                onChange={(e) => setMaxInstallments(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <Label className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-600" /> Master Secret Reset Security PIN
            </Label>
            <Input
              type="text"
              value={secretPin}
              onChange={(e) => setSecretPin(e.target.value)}
              placeholder="e.g. 8208"
              className="max-w-xs font-mono font-bold tracking-wider"
            />
            <p className="text-xs text-muted-foreground">
              This secret code is required to confirm full system data deletion / test reset.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SMS Template */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" /> SMS & WhatsApp Reminders
          </CardTitle>
          <CardDescription>
            Variables: {"{customerName}"}, {"{pendingAmount}"}, {"{installmentNumber}"}, {"{totalInstallments}"}, {"{dueDate}"}, {"{companyName}"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={smsTemplate}
            onChange={(e) => setSmsTemplate(e.target.value)}
            rows={5}
            className="font-mono text-xs"
          />
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="gap-2 gradient-primary" size="lg">
        <Save className="w-4 h-4" /> Save Preferences
      </Button>

      {/* ================= DANGER ZONE / SYSTEM RESET ================= */}
      <Card className="border-red-500/30 bg-red-500/5 dark:bg-red-950/20 backdrop-blur-xl rounded-2xl overflow-hidden mt-10">
        <CardHeader className="border-b border-red-500/20 bg-red-500/10 dark:bg-red-950/30 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-5 h-5 text-red-600 animate-pulse" />
              <CardTitle className="text-lg font-bold">Danger Zone — Test Phase Data Reset</CardTitle>
            </div>
            <Badge variant="destructive" className="font-mono text-xs bg-red-600 text-white">
              Test Mode Utility
            </Badge>
          </div>
          <CardDescription className="text-red-900/80 dark:text-red-300/80 mt-1 text-xs sm:text-sm">
            Wipe all test customers, recoveries, investors, resellers & logs with a single click using secret code <strong>8208</strong>.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-background/60 border border-red-500/20">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Trash2 className="w-4 h-4 text-red-500" /> Wipe & Reset All Test Records
              </h4>
              <p className="text-xs text-muted-foreground">
                Permanently clears Firebase collections to start fresh with real shop data.
              </p>
            </div>

            <Button
              variant="destructive"
              className="gap-2 shadow-lg shadow-red-600/20 font-semibold shrink-0"
              onClick={() => {
                setEnteredPin("");
                setIsResetOpen(true);
              }}
            >
              <RefreshCw className="w-4 h-4" /> Clear & Reset Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SYSTEM RESET CONFIRMATION MODAL */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="max-w-xl border-red-500/30">
          <DialogHeader>
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Delete All Test Data (System Reset)</DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  Targeted Firebase wipe for test phase cleanup.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Selected categories will be completely erased from Firestore. This operation cannot be undone.
              </span>
            </div>

            {/* Select/Deselect All Header */}
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Select Collections to Clear ({selectedCollections.length}/{RESET_OPTIONS.length})
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllCollections}
                  className="text-xs text-emerald-600 hover:underline font-medium"
                >
                  Select All
                </button>
                <span className="text-xs text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={deselectAllCollections}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Collection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {RESET_OPTIONS.map((opt) => {
                const isSelected = selectedCollections.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => toggleCollection(opt.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-red-500/10 border-red-500/40 text-foreground"
                        : "bg-muted/20 border-border/60 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded mt-0.5 shrink-0 flex items-center justify-center border transition-colors ${
                        isSelected
                          ? "bg-red-600 border-red-600 text-white"
                          : "border-muted-foreground/40"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold leading-none">{opt.name}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">
                        {opt.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Security PIN Entry */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-red-600 dark:text-red-400">
                <Lock className="w-3.5 h-3.5" /> Enter Secret PIN to Confirm (Standard Code: <span className="font-mono bg-red-500/10 px-1 rounded">8208</span>)
              </Label>
              <Input
                type="password"
                placeholder="Enter secret code 8208"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                className="font-mono text-center tracking-widest text-base font-bold border-red-500/40 focus-visible:ring-red-500"
              />
            </div>

            {isDeleting && (
              <div className="p-3 rounded-xl bg-muted border border-border text-center space-y-1">
                <p className="text-xs font-semibold text-emerald-600 animate-pulse">
                  {deleteProgress || "Wiping database records..."}
                </p>
                <p className="text-[10px] text-muted-foreground">Please do not close this window.</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={isDeleting}
              onClick={() => setIsResetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting || enteredPin.trim() !== secretPin.trim() || selectedCollections.length === 0}
              onClick={handleSystemReset}
              className="gap-2 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" /> Confirm & Wipe All Selected Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
