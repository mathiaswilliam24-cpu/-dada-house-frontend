"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Device, Call as TwilioCall } from "@twilio/voice-sdk";
import { Phone, PhoneOff, Mic, MicOff, Pause, Play, ChevronDown, ChevronUp } from "lucide-react";

type ConnectionState = "idle" | "incoming" | "connecting" | "in-call";

const CALL_REQUEST_EVENT = "dada:call-request";

/** Ask the mounted <Softphone /> to dial a number — used by "Call" buttons elsewhere (e.g. a customer profile). */
export function requestCall(phone: string) {
  window.dispatchEvent(new CustomEvent(CALL_REQUEST_EVENT, { detail: { phone } }));
}

export function Softphone() {
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<TwilioCall | null>(null);
  const [state, setState] = useState<ConnectionState>("idle");
  const [incomingFrom, setIncomingFrom] = useState("");
  const [dialNumber, setDialNumber] = useState("");
  const [muted, setMuted] = useState(false);
  const [onHold, setOnHold] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [minimized, setMinimized] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, []);
  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let refreshInterval: ReturnType<typeof setInterval> | null = null;

    async function fetchToken(): Promise<string> {
      const res = await fetch("/api/twilio/voice/token");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to get voice token");
      return data.token;
    }

    async function init() {
      try {
        const token = await fetchToken();
        if (cancelled) return;

        const device = new Device(token, { logLevel: "error" });
        deviceRef.current = device;

        device.on("incoming", (call) => {
          callRef.current = call;
          setIncomingFrom(call.parameters.From ?? "Unknown");
          setState("incoming");

          call.on("accept", () => { setState("in-call"); startTimer(); });
          call.on("disconnect", () => { setState("idle"); stopTimer(); callRef.current = null; });
          call.on("cancel", () => { setState("idle"); callRef.current = null; });
        });

        device.on("error", (err) => { setError(err.message ?? "Softphone error"); setMinimized(true); });
        await device.register();

        // Access Tokens expire after 1h (see lib/twilio-voice.ts ttl) — refresh well
        // before that so the Device never silently stops receiving calls while the
        // agent's tab stays open showing "Available" for hours.
        refreshInterval = setInterval(async () => {
          try {
            const freshToken = await fetchToken();
            deviceRef.current?.updateToken(freshToken);
          } catch (err) {
            console.error("Failed to refresh Twilio Voice token", err);
          }
        }, 45 * 60 * 1000);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to initialize softphone");
          setMinimized(true);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      if (refreshInterval) clearInterval(refreshInterval);
      deviceRef.current?.destroy();
      stopTimer();
    };
  }, [startTimer, stopTimer]);

  useEffect(() => {
    if (state === "incoming") setMinimized(false);
  }, [state]);

  function acceptCall() {
    callRef.current?.accept();
  }

  function declineCall() {
    callRef.current?.reject();
    setState("idle");
  }

  const placeCall = useCallback(async (numberOverride?: string) => {
    const number = (numberOverride ?? dialNumber).trim();
    if (!number || !deviceRef.current) return;
    setDialNumber(number);
    setState("connecting");
    const call = await deviceRef.current.connect({ params: { To: number } });
    callRef.current = call;
    call.on("accept", () => { setState("in-call"); startTimer(); });
    call.on("disconnect", () => { setState("idle"); stopTimer(); callRef.current = null; });
    call.on("cancel", () => { setState("idle"); callRef.current = null; });
  }, [dialNumber, startTimer, stopTimer]);

  useEffect(() => {
    function onCallRequest(e: Event) {
      const phone = (e as CustomEvent<{ phone: string }>).detail?.phone;
      if (phone) {
        setMinimized(false);
        placeCall(phone);
      }
    }
    window.addEventListener(CALL_REQUEST_EVENT, onCallRequest);
    return () => window.removeEventListener(CALL_REQUEST_EVENT, onCallRequest);
  }, [placeCall]);

  function hangUp() {
    callRef.current?.disconnect();
    setState("idle");
    stopTimer();
  }

  function toggleMute() {
    const next = !muted;
    callRef.current?.mute(next);
    setMuted(next);
  }

  function toggleHold() {
    // Twilio Voice SDK has no native hold — approximate via mute both ways is
    // out of scope for Phase 1; expose the control as a mute-based stand-in
    // and revisit with a real hold (conference-based) in a later phase.
    toggleMute();
    setOnHold(!onHold);
  }

  function sendDigit(digit: string) {
    callRef.current?.sendDigits(digit);
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-72 max-h-[70vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-200">
      <div className="bg-[#0D1D5E] text-white px-4 py-2.5 flex items-center justify-between sticky top-0">
        <span className="text-sm font-bold">Softphone</span>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${state === "idle" ? "bg-gray-400" : "bg-green-400"}`} />
          <button onClick={() => setMinimized((m) => !m)} className="text-white/70 hover:text-white" title={minimized ? "Expand" : "Minimize"}>
            {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {minimized ? (
        error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2">Voice not configured</p>
      ) : (
      <>
      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2">{error}</p>}

      <div className="p-4 space-y-3">
        {state === "incoming" && (
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-500">Incoming call</p>
            <p className="font-bold text-gray-900">{incomingFrom}</p>
            <div className="flex justify-center gap-3">
              <button onClick={acceptCall} className="w-11 h-11 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center"><Phone className="w-5 h-5" /></button>
              <button onClick={declineCall} className="w-11 h-11 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center"><PhoneOff className="w-5 h-5" /></button>
            </div>
          </div>
        )}

        {state === "in-call" && (
          <div className="space-y-3">
            <p className="text-center text-sm text-gray-500">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</p>
            <div className="flex justify-center gap-2">
              <button onClick={toggleMute} className={`w-9 h-9 rounded-full flex items-center justify-center ${muted ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"}`}>
                {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button onClick={toggleHold} className={`w-9 h-9 rounded-full flex items-center justify-center ${onHold ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>
                {onHold ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              <button onClick={hangUp} className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center"><PhoneOff className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((d) => (
                <button key={d} onClick={() => sendDigit(d)} className="py-1.5 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg">{d}</button>
              ))}
            </div>
          </div>
        )}

        {(state === "idle" || state === "connecting") && (
          <div className="space-y-2">
            <input
              value={dialNumber}
              onChange={(e) => setDialNumber(e.target.value)}
              placeholder="Enter phone number"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]"
            />
            <button
              onClick={() => placeCall()}
              disabled={state === "connecting" || !dialNumber.trim()}
              className="w-full py-2 bg-[#F7921A] hover:bg-[#E07F10] disabled:opacity-60 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" /> {state === "connecting" ? "Calling…" : "Call"}
            </button>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
