import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | undefined | null): string {
  const val = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string | undefined | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateCustomerId(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function getDaysOverdue(dueDate: Date | string | undefined | null): number {
  if (!dueDate) return 0;
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (isNaN(due.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = today.getTime() - due.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getDaysUntilDue(dueDate: Date | string | undefined | null): number {
  if (!dueDate) return 0;
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (isNaN(due.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = due.getTime() - today.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getInstallmentStatus(dueDate: Date | string | undefined | null): "overdue" | "due-soon" | "upcoming" | "paid" {
  if (!dueDate) return "upcoming";
  const daysOverdue = getDaysOverdue(dueDate);
  if (daysOverdue > 0) return "overdue";
  if (daysOverdue >= -3) return "due-soon";
  return "upcoming";
}

export function getPortalUrl(): string {
  if (typeof window === "undefined") return "https://brother-mobiles.vercel.app";
  if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return window.location.origin;
  }
  return "https://brother-mobiles.vercel.app";
}

export function getPortalUrlWithCreds(email?: string, password?: string): string {
  const baseUrl = getPortalUrl();
  if (!email) return baseUrl;

  let url = `${baseUrl}/?email=${encodeURIComponent(email)}`;
  if (password && password !== "N/A" && !password.includes("As set during")) {
    url += `&password=${encodeURIComponent(password)}`;
  }
  return url;
}
