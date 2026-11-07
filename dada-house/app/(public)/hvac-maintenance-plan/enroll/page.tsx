import type { Metadata } from "next";
import { Suspense } from "react";
import EnrollmentWizard from "@/components/enrollment/EnrollmentWizard";

export const metadata: Metadata = {
  title: "Enroll — HVAC Maintenance Plan | DADA HOUSE",
  description: "Enroll in the DADA HOUSE HVAC Maintenance Plan online. Select your plan, add properties, and pay securely in under 5 minutes.",
};

export default function EnrollPage() {
  return (
    <Suspense>
      <EnrollmentWizard />
    </Suspense>
  );
}
