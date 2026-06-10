import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export const appointmentSchema = z.object({
  service: z.string().min(1, "Service is required"),
  subservice: z.string().optional(),
  name: z.string().min(2, "Full name is required"),
  phone: z.string().min(7, "Phone number is required"),
  email: z.string().email("Valid email is required"),
  address: z.string().min(5, "Service address is required"),
  city: z.string().min(2, "City is required"),
  zipCode: z.string().min(5, "Zip code is required"),
  description: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  photos: z.array(z.string()).default([]),
});

// Booking submitted by the AI voice agent (Vapi) — looser than the website
// form since callers don't always give a zip code or email.
export const voiceAgentAppointmentSchema = z.object({
  service: z.string().min(1, "Service is required"),
  name: z.string().min(2, "Full name is required"),
  phone: z.string().min(7, "Phone number is required"),
  email: z
    .union([z.literal(""), z.string().email("Valid email is required")])
    .optional()
    .default(""),
  address: z.string().min(3, "Service address is required"),
  city: z.string().optional().default("Houston"),
  zipCode: z.string().optional().default(""),
  description: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  // false if Google Calendar sync failed and the slot still needs admin confirmation
  calendarSynced: z.boolean().optional().default(true),
});

export const reviewSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  service: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(10, "Review must be at least 10 characters"),
  photos: z.array(z.string()).default([]),
});

export const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
});

export const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  service: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export const TECH_STATUSES = [
  "ASSIGNED",
  "ACCEPTED",
  "EN_ROUTE",
  "ARRIVED",
  "DIAGNOSING",
  "WAITING_FOR_APPROVAL",
  "WORKING",
  "COMPLETED",
  "CANCELED",
  "NEED_RESCHEDULE",
] as const;

export type TechStatusValue = typeof TECH_STATUSES[number];

export const techJobStatusSchema = z.object({
  status: z.enum(TECH_STATUSES),
});

export const diagnosisSchema = z.object({
  problemFound: z.string().min(1, "Problem found is required"),
  causeOfIssue: z.string().optional(),
  recommendedSolution: z.string().optional(),
  requiredParts: z.array(z.string()).default([]),
  laborNeeded: z.string().optional(),
  estimatedTime: z.string().optional(),
  safetyNotes: z.string().optional(),
});

export const jobPartSchema = z.object({
  partName: z.string().min(1, "Part name is required"),
  partNumber: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  unitCost: z.number().min(0).default(0),
  warrantyPeriod: z.string().optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

export const jobPaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  method: z.enum(["CASH", "CARD", "ZELLE", "CHECK"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const techProfileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
  bio: z.string().optional(),
  specialties: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  serviceAreas: z.array(z.string()).default([]),
  vehicle: z.string().optional(),
  licenseNumber: z.string().optional(),
  vehicleInfo: z.object({
    make: z.string().optional(),
    model: z.string().optional(),
    year: z.string().optional(),
    plate: z.string().optional(),
    color: z.string().optional(),
  }).optional(),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string().optional(),
    expiresAt: z.string().optional(),
  })).optional(),
});

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  comparePrice: z.number().optional(),
  images: z.array(z.string()).default([]),
  category: z.string().min(1, "Category is required"),
  inStock: z.boolean().default(true),
  stockCount: z.number().int().optional(),
  featured: z.boolean().default(false),
});

export const aiMessageSchema = z.object({
  message: z.string().min(1, "Message is required"),
  conversationId: z.string().optional(),
});

export const servicePlanSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().positive(),
  interval: z.enum(["monthly", "annual"]),
  features: z.array(z.string()).default([]),
});

export const propertySchema = z.object({
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().default("TX"),
  zipCode: z.string().min(5, "Zip code is required"),
  type: z.string().default("Residential"),
  sqft: z.number().int().optional(),
  yearBuilt: z.number().int().optional(),
  notes: z.string().optional(),
  equipment: z.array(z.string()).default([]),
});

export const warrantySchema = z.object({
  equipmentName: z.string().min(1, "Equipment name is required"),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  installDate: z.string().optional(),
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
  appointmentId: z.string().optional(),
});

export const phoneOtpSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, "Must be E.164 format, e.g. +15551234567"),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, "Must be E.164 format"),
  code: z.string().length(6, "Code must be 6 digits"),
});

export type DiagnosisInput = z.infer<typeof diagnosisSchema>;
export type JobPartInput = z.infer<typeof jobPartSchema>;
export type JobPaymentInput = z.infer<typeof jobPaymentSchema>;
export type TechProfileInput = z.infer<typeof techProfileSchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type AppointmentInput = z.input<typeof appointmentSchema>;
export type AppointmentOutput = z.infer<typeof appointmentSchema>;
export type VoiceAgentAppointmentInput = z.input<typeof voiceAgentAppointmentSchema>;
export type ReviewInput = z.input<typeof reviewSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type ProductInput = z.input<typeof productSchema>;
export type PropertyInput = z.input<typeof propertySchema>;
export type WarrantyInput = z.infer<typeof warrantySchema>;
