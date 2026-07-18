"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2, Calendar, Clock, Wrench } from "lucide-react";
import Link from "next/link";

type ApptInfo = {
  appointmentNumber: string;
  name: string;
  service: string;
  preferredDate: string | null;
  preferredTime: string | null;
};

export default function ConfirmPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [appt, setAppt] = useState<ApptInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch(`/api/confirm/${token}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Something went wrong");
        setAppt(d.appointment);
        setStatus("success");
      })
      .catch((e) => {
        setErrorMsg(e.message);
        setStatus("error");
      });
  }, [token]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#1B3FA8] mx-auto mb-3" />
          <p className="text-gray-500">Confirming your appointment…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-red-200 p-8 text-center shadow-sm">
          <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Invalid</h1>
          <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-bold">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const date = appt?.preferredDate
    ? new Date(appt.preferredDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-green-200 p-8 text-center shadow-sm">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-1">Appointment Confirmed!</h1>
        <p className="text-gray-500 text-sm mb-6">
          Thank you, <strong>{appt?.name}</strong>. Your appointment is confirmed and our team has been notified.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="font-bold text-[#1B3FA8]">#{appt?.appointmentNumber}</span>
          </div>
          {appt?.service && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Wrench className="w-4 h-4 text-[#F7921A] shrink-0" />
              {appt.service}
            </div>
          )}
          {date && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-[#F7921A] shrink-0" />
              {date}
            </div>
          )}
          {appt?.preferredTime && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-[#F7921A] shrink-0" />
              {appt.preferredTime}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mb-5">
          Questions? Call us at{" "}
          <a href="tel:+13466499353" className="text-[#1B3FA8] font-semibold">(346) 649-9353</a>
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#F7921A] text-white rounded-xl text-sm font-bold"
        >
          Back to DADA HOUSE
        </Link>
      </div>
    </div>
  );
}
