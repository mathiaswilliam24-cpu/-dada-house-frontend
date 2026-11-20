"use client";
import { useParams } from "next/navigation";
import DiagnosticWizard from "@/components/hvac/diagnostic-wizard";

export default function HvacDiagnosticSessionPage() {
  const { id } = useParams<{ id: string }>();
  return <DiagnosticWizard id={id} />;
}
