"use client";
export const dynamic = "force-dynamic";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Lock,
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  HardDrive,
  RefreshCw,
  Trash2,
  Shield,
  Clock,
  FileUp,
  FileDown,
  Zap,
  Archive,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  createBackup,
  getBackupList,
  deleteBackup,
  exportBackupAsFile,
  parseImportFile,
  restoreBackupToFirestore,
  getAutoBackupEnabled,
  setAutoBackupEnabled as setAutoBackupPref,
  formatBackupSize,
  BackupMeta,
  BackupData,
} from "@/lib/backup";

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState("Brother Mobiles");
  const [defaultExpense, setDefaultExpense] = useState("2000");
  const [defaultCommission, setDefaultCommission] = useState("2");
  const [maxInstallments, setMaxInstallments] = useState("9");
  const [secretPin, setSecretPin] = useState("8208");
  const [smsTemplate, setSmsTemplate] = useState(
    `Assalam o Alaikum {customerName},\n\nAapki installment #{installmentNumber}/{totalInstallments} ki payment Rs. {pendingAmount} ki due date {dueDate} hai.\n\nShukriya,\n{companyName}`
  );

  // Backup State
  const [autoBackup, setAutoBackup] = useState(true);
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState("");

  // Import Dialog State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importData, setImportData] = useState<BackupData | null>(null);
  const [importPin, setImportPin] = useState("");
  const [importFileName, setImportFileName] = useState("");

  // Load backup list and auto-backup pref
  const refreshBackups = useCallback(() => {
    setBackups(getBackupList());
    setAutoBackup(getAutoBackupEnabled());
  }, []);

  useEffect(() => {
    refreshBackups();
  }, [refreshBackups]);

  const handleSave = () => {
    toast.success("Settings saved successfully!");
  };

  // ── Create Manual Backup ──
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    const toastId = toast.loading("Creating backup...");
    try {
      const meta = await createBackup("manual");
      toast.success("Backup created successfully!", {
        id: toastId,
        description: `${meta.totalRecords} records saved (${formatBackupSize(meta.sizeBytes)})`,
      });
      refreshBackups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Backup failed";
      toast.error("Backup failed!", { id: toastId, description: msg });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // ── Toggle Auto-Backup ──
  const handleAutoBackupToggle = (checked: boolean) => {
    setAutoBackup(checked);
    setAutoBackupPref(checked);
    toast.success(checked ? "Auto-backup enabled" : "Auto-backup disabled", {
      description: checked
        ? "System will create backups when new data is added"
        : "Auto-backups turned off — create backups manually",
    });
  };

  // ── Export Backup ──
  const handleExport = (id: string) => {
    const ok = exportBackupAsFile(id);
    if (ok) {
      toast.success("Backup downloaded!", { description: "JSON file saved to your Downloads folder" });
    } else {
      toast.error("Could not export — backup not found in storage");
    }
  };

  // ── Delete Backup ──
  const handleDeleteBackup = (id: string) => {
    deleteBackup(id);
    refreshBackups();
    toast.success("Backup deleted");
  };

  // ── Import: File Selection ──
  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);

    const toastId = toast.loading("Reading backup file...");
    const data = await parseImportFile(file);

    if (!data) {
      toast.error("Invalid backup file!", {
        id: toastId,
        description: "File format not recognized. Use a Brother Mobiles backup JSON file.",
      });
      return;
    }

    toast.dismiss(toastId);
    setImportData(data);
    setImportPin("");
    setIsImportOpen(true);

    // Reset file input
    e.target.value = "";
  };

  // ── Import: Restore ──
  const handleRestore = async () => {
    if (!importData) return;
    if (importPin.trim() !== secretPin.trim()) {
      toast.error("Incorrect Security PIN! Access Denied.");
      return;
    }

    setIsRestoring(true);
    const toastId = toast.loading("Restoring backup to database...");

    try {
      const count = await restoreBackupToFirestore(importData, (msg) => {
        setRestoreProgress(msg);
        toast.loading(msg, { id: toastId });
      });

      toast.success("🎉 Backup restored successfully!", {
        id: toastId,
        description: `${count} records restored to Firestore. Page will refresh.`,
      });

      setIsImportOpen(false);
      setImportData(null);
      setImportPin("");

      // Refresh the page after a short delay
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Restore failed";
      toast.error("Restore failed!", { id: toastId, description: msg });
    } finally {
      setIsRestoring(false);
      setRestoreProgress("");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage shop configurations, default values, SMS templates & data backups
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
              <Lock className="w-3.5 h-3.5 text-amber-600" /> Master Security PIN
            </Label>
            <Input
              type="text"
              value={secretPin}
              onChange={(e) => setSecretPin(e.target.value)}
              placeholder="e.g. 8208"
              className="max-w-xs font-mono font-bold tracking-wider"
            />
            <p className="text-xs text-muted-foreground">
              This secret code is required to confirm data restore operations.
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

      {/* ═══════════════════════════════════════════════════════════════
          BACKUP & DATA SAFETY
      ═══════════════════════════════════════════════════════════════ */}
      <Card className="border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 backdrop-blur-xl rounded-2xl overflow-hidden mt-10">
        <CardHeader className="border-b border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-950/30 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
              <Shield className="w-5 h-5" />
              <CardTitle className="text-lg font-bold">Backup & Data Safety</CardTitle>
            </div>
            <Badge className="font-mono text-xs bg-emerald-600 text-white border-0">
              {backups.length} Backup{backups.length !== 1 ? "s" : ""} Saved
            </Badge>
          </div>
          <CardDescription className="text-emerald-900/80 dark:text-emerald-300/80 mt-1 text-xs sm:text-sm">
            Automatic & manual backups to protect your business data. Export backups as files and import/restore anytime.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">

          {/* Auto-Backup Toggle + Create Manual Backup */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-background/60 border border-emerald-500/20">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Auto-Backup</h4>
                  <p className="text-[11px] text-muted-foreground">
                    {autoBackup
                      ? "System creates backup when new customer/investor is added"
                      : "Auto-backup is OFF — create backups manually"}
                  </p>
                </div>
              </div>
              <Switch
                checked={autoBackup}
                onCheckedChange={handleAutoBackupToggle}
              />
            </div>

            <Button
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 font-semibold shrink-0"
            >
              {isCreatingBackup ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4" /> Create Backup Now
                </>
              )}
            </Button>
          </div>

          {/* Import Backup */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-background/60 border border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <FileUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Import & Restore Backup</h4>
                <p className="text-[11px] text-muted-foreground">
                  Upload a previously exported backup file to restore your data
                </p>
              </div>
            </div>
            <label className="shrink-0">
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportFileSelect}
              />
              <Button variant="outline" className="gap-2 font-semibold border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 cursor-pointer" asChild>
                <span>
                  <Upload className="w-4 h-4" /> Upload Backup File
                </span>
              </Button>
            </label>
          </div>

          {/* Saved Backups List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5" />
                Saved Backups ({backups.length}/10)
              </h4>
              <p className="text-[10px] text-muted-foreground">Auto-cleanup: 30 days, max 10</p>
            </div>

            {backups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl bg-muted/20 border border-border/40">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                  <Database className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold">No backups yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Click &quot;Create Backup Now&quot; to save your first backup, or enable Auto-Backup.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {backups.map((b) => {
                  const date = new Date(b.timestamp);
                  const timeAgo = getRelativeTime(date);
                  return (
                    <div
                      key={b.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-background/60 border border-border/50 hover:border-emerald-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${b.type === "auto" ? "bg-violet-500/10 border border-violet-500/15" : "bg-emerald-500/10 border border-emerald-500/15"}`}>
                          {b.type === "auto" ? (
                            <Zap className="w-4 h-4 text-violet-500" />
                          ) : (
                            <HardDrive className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold truncate">{b.label}</p>
                            <Badge
                              variant="outline"
                              className={`text-[9px] font-bold rounded-md px-1.5 py-0.5 ${
                                b.type === "auto"
                                  ? "text-violet-600 bg-violet-500/8 border-violet-500/20"
                                  : "text-emerald-600 bg-emerald-500/8 border-emerald-500/20"
                              }`}
                            >
                              {b.type === "auto" ? "Auto" : "Manual"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {date.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}{" "}
                              {date.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                              {" · "}{timeAgo}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {b.totalRecords} records · {formatBackupSize(b.sizeBytes)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs font-semibold h-8 rounded-lg border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                          onClick={() => handleExport(b.id)}
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          Export
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs font-semibold h-8 rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-600"
                          onClick={() => handleDeleteBackup(b.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          IMPORT / RESTORE CONFIRMATION DIALOG
      ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-xl border-blue-500/30">
          <DialogHeader>
            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <FileUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Restore Backup</DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  Import data from: <strong>{importFileName}</strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Warning */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Restoring a backup will <strong>replace all existing data</strong> in Firestore with the backup data. This cannot be undone.
              </span>
            </div>

            {/* Backup Info */}
            {importData && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Backup Contents
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(importData.meta.recordCounts || {}).map(([col, count]) => (
                    <div
                      key={col}
                      className="px-3 py-2 rounded-lg bg-muted/40 border border-border/50 text-center"
                    >
                      <p className="text-sm font-bold">{count as number}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{col.replace(/_/g, " ")}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    Total: <strong>{importData.meta.totalRecords}</strong> records
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Created: {new Date(importData.meta.timestamp).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            )}

            {/* Security PIN */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Lock className="w-3.5 h-3.5" /> Enter Security PIN to Confirm Restore
              </Label>
              <Input
                type="password"
                placeholder="Enter your security PIN"
                value={importPin}
                onChange={(e) => setImportPin(e.target.value)}
                className="font-mono text-center tracking-widest text-base font-bold border-blue-500/40 focus-visible:ring-blue-500"
              />
            </div>

            {isRestoring && (
              <div className="p-3 rounded-xl bg-muted border border-border text-center space-y-1">
                <p className="text-xs font-semibold text-emerald-600 animate-pulse">
                  {restoreProgress || "Restoring database records..."}
                </p>
                <p className="text-[10px] text-muted-foreground">Please do not close this window.</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={isRestoring}
              onClick={() => {
                setIsImportOpen(false);
                setImportData(null);
                setImportPin("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={isRestoring || importPin.trim() !== secretPin.trim() || !importData}
              onClick={handleRestore}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Restoring...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Confirm & Restore Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Helper: Relative time ──
function getRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
