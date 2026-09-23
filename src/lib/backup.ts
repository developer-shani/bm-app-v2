// ============================================
// BROTHER MOBILES — Backup & Restore System
// ============================================
// Stores Firestore snapshots in localStorage.
// Auto-backup triggers on key data changes.
// Supports export/import as JSON files.
// ============================================

import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

// ── Constants ──
const BACKUP_PREFIX = "bm_backup_";
const BACKUP_INDEX_KEY = "bm_backup_index";
const AUTO_BACKUP_KEY = "bm_auto_backup_enabled";
const MAX_BACKUPS = 10;
const MAX_AGE_DAYS = 30;

// All collections to backup
const BACKUP_COLLECTIONS = [
  "customers",
  "investors",
  "recoveries",
  "investments",
  "withdrawals",
  "resellers",
  "notifications",
  "deleted_records",
  "pending_approvals",
] as const;

// ── Types ──
export interface BackupMeta {
  id: string;
  timestamp: string;
  label: string;
  type: "auto" | "manual";
  sizeBytes: number;
  recordCounts: Record<string, number>;
  totalRecords: number;
}

export interface BackupData {
  meta: BackupMeta;
  collections: Record<string, Record<string, any>[]>;
}

// ── Index Management ──
function getBackupIndex(): BackupMeta[] {
  try {
    const raw = localStorage.getItem(BACKUP_INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BackupMeta[];
  } catch {
    return [];
  }
}

function saveBackupIndex(index: BackupMeta[]) {
  localStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(index));
}

// ── Auto-Backup Toggle ──
export function getAutoBackupEnabled(): boolean {
  try {
    const val = localStorage.getItem(AUTO_BACKUP_KEY);
    return val === null ? true : val === "true"; // default ON
  } catch {
    return true;
  }
}

export function setAutoBackupEnabled(enabled: boolean) {
  localStorage.setItem(AUTO_BACKUP_KEY, String(enabled));
}

// ── Core: Create Backup ──
export async function createBackup(
  type: "auto" | "manual" = "manual",
  label?: string
): Promise<BackupMeta> {
  const now = new Date();
  const id = `${now.getTime()}`;
  const timestamp = now.toISOString();

  const collections: Record<string, Record<string, any>[]> = {};
  const recordCounts: Record<string, number> = {};
  let totalRecords = 0;

  // Fetch all collections from Firestore
  for (const colName of BACKUP_COLLECTIONS) {
    try {
      const snapshot = await getDocs(collection(db, colName));
      const docs = snapshot.docs.map((d) => ({ _docId: d.id, ...d.data() }));
      collections[colName] = docs;
      recordCounts[colName] = docs.length;
      totalRecords += docs.length;
    } catch (err) {
      console.warn(`Backup: Could not fetch ${colName}:`, err);
      collections[colName] = [];
      recordCounts[colName] = 0;
    }
  }

  const backupData: BackupData = {
    meta: {
      id,
      timestamp,
      label: label || (type === "auto" ? `Auto Backup` : `Manual Backup`),
      type,
      sizeBytes: 0,
      recordCounts,
      totalRecords,
    },
    collections,
  };

  // Serialize and measure size
  const serialized = JSON.stringify(backupData);
  backupData.meta.sizeBytes = new Blob([serialized]).size;

  // Save to localStorage
  try {
    localStorage.setItem(BACKUP_PREFIX + id, serialized);
  } catch (e) {
    // Storage full — remove oldest backup and retry
    const index = getBackupIndex();
    if (index.length > 0) {
      const oldest = index[index.length - 1];
      localStorage.removeItem(BACKUP_PREFIX + oldest.id);
      const newIndex = index.filter((b) => b.id !== oldest.id);
      saveBackupIndex(newIndex);
      localStorage.setItem(BACKUP_PREFIX + id, serialized);
    } else {
      throw new Error("localStorage full — cannot create backup");
    }
  }

  // Update index
  const index = getBackupIndex();
  index.unshift(backupData.meta);

  // Enforce limits
  const pruned = enforceBackupLimits(index);
  saveBackupIndex(pruned);

  return backupData.meta;
}

// ── Enforce Limits: Max count + Max age ──
function enforceBackupLimits(index: BackupMeta[]): BackupMeta[] {
  const now = Date.now();
  const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  let result = [...index];

  // Remove expired backups
  const expired = result.filter(
    (b) => now - new Date(b.timestamp).getTime() > maxAgeMs
  );
  for (const b of expired) {
    localStorage.removeItem(BACKUP_PREFIX + b.id);
  }
  result = result.filter(
    (b) => now - new Date(b.timestamp).getTime() <= maxAgeMs
  );

  // Keep only MAX_BACKUPS
  while (result.length > MAX_BACKUPS) {
    const removed = result.pop();
    if (removed) {
      localStorage.removeItem(BACKUP_PREFIX + removed.id);
    }
  }

  return result;
}

// ── Get Backup List ──
export function getBackupList(): BackupMeta[] {
  return getBackupIndex();
}

// ── Delete a Backup ──
export function deleteBackup(id: string): boolean {
  localStorage.removeItem(BACKUP_PREFIX + id);
  const index = getBackupIndex().filter((b) => b.id !== id);
  saveBackupIndex(index);
  return true;
}

// ── Export Backup as downloadable JSON file ──
export function exportBackupAsFile(id: string): boolean {
  const raw = localStorage.getItem(BACKUP_PREFIX + id);
  if (!raw) return false;

  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  const meta = getBackupIndex().find((b) => b.id === id);
  const dateStr = meta
    ? new Date(meta.timestamp).toLocaleDateString("en-PK", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).replace(/\s+/g, "-")
    : id;

  a.href = url;
  a.download = `BrotherMobiles_Backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

// ── Parse Import File (Preview) ──
export async function parseImportFile(
  file: File
): Promise<BackupData | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as BackupData;
        if (!data.meta || !data.collections) {
          resolve(null);
          return;
        }
        resolve(data);
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

// ── Restore Backup from file data to Firestore ──
export async function restoreBackupToFirestore(
  data: BackupData,
  onProgress?: (msg: string) => void
): Promise<number> {
  let totalRestored = 0;

  for (const colName of BACKUP_COLLECTIONS) {
    const docs = data.collections[colName];
    if (!docs || docs.length === 0) continue;

    onProgress?.(`Clearing existing ${colName}...`);

    // Step 1: Clear existing collection
    const existingSnap = await getDocs(collection(db, colName));
    if (!existingSnap.empty) {
      let batch = writeBatch(db);
      let count = 0;
      for (const docSnap of existingSnap.docs) {
        batch.delete(doc(db, colName, docSnap.id));
        count++;
        if (count === 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
    }

    onProgress?.(`Restoring ${docs.length} records to ${colName}...`);

    // Step 2: Write backup data
    let batch = writeBatch(db);
    let count = 0;
    for (const record of docs) {
      const { _docId, ...docData } = record;
      const docRef = _docId
        ? doc(db, colName, _docId)
        : doc(collection(db, colName));
      batch.set(docRef, docData);
      count++;
      totalRestored++;
      if (count === 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) await batch.commit();
  }

  return totalRestored;
}

// ── Auto-Backup Trigger (non-blocking) ──
export function triggerAutoBackup() {
  if (!getAutoBackupEnabled()) return;

  // Run in background — don't block the UI
  setTimeout(async () => {
    try {
      await createBackup("auto");
      console.log("[Backup] Auto-backup created successfully");
    } catch (err) {
      console.warn("[Backup] Auto-backup failed:", err);
    }
  }, 2000); // 2s delay to let Firestore writes settle
}

// ── Format backup size for display ──
export function formatBackupSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
