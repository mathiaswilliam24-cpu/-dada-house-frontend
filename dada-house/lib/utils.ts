import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string, fmt = "MMM d, yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, fmt);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

export function generateAppointmentNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `DH-${year}-${random}`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "PENDING":
      return "text-yellow-700 bg-yellow-50 border-yellow-200";
    case "CONFIRMED":
      return "text-blue-700 bg-blue-50 border-blue-200";
    case "IN_PROGRESS":
      return "text-orange-700 bg-orange-50 border-orange-200";
    case "COMPLETED":
      return "text-green-700 bg-green-50 border-green-200";
    case "CANCELLED":
      return "text-red-700 bg-red-50 border-red-200";
    default:
      return "text-gray-700 bg-gray-50 border-gray-200";
  }
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return labels[status] ?? status;
}

export function truncate(text: string, length = 150): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + "…";
}

export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `DH-ORD-${year}-${random}`;
}

export function generateEstimateNumber(): string {
  const n = Math.floor(Math.random() * 899) + 100;
  const seq = Math.floor(Math.random() * 900) + 100;
  return `EST${n}${seq}`;
}

export function getTechStatusColor(status: string): string {
  switch (status) {
    case "EN_ROUTE":
      return "text-blue-700 bg-blue-50 border-blue-200";
    case "ARRIVED":
      return "text-purple-700 bg-purple-50 border-purple-200";
    case "WORKING":
      return "text-orange-700 bg-orange-50 border-orange-200";
    case "COMPLETED":
      return "text-green-700 bg-green-50 border-green-200";
    default:
      return "text-gray-700 bg-gray-50 border-gray-200";
  }
}

export function getTechStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    EN_ROUTE: "En Route",
    ARRIVED: "Arrived",
    WORKING: "Working",
    COMPLETED: "Completed",
  };
  return labels[status] ?? status;
}

export function formatAddress(p: {
  address: string;
  city: string;
  state?: string;
  zipCode: string;
}): string {
  return `${p.address}, ${p.city}, ${p.state ?? "TX"} ${p.zipCode}`;
}
