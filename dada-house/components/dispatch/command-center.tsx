"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, AlertOctagon, Bell, CalendarRange, CheckCircle2, Clock, DollarSign, Loader2, Navigation, PhoneCall,
  PlusCircle, RefreshCw, Siren, Truck, Users, Wrench, Activity, Gauge, Inbox, XCircle, Info,
} from "lucide-react";
import type { CommandCenterData, AlertSeverity } from "@/lib/dispatch-alerts";

const TZ = "America/New_York";
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const SEV: Record<AlertSeverity, { label: string; row: string; chip: string; icon: typeof AlertTriangle }> = {
  critical: { label: "Critical", row: "border-l-red-600 bg-red-50/60", chip: "bg-red-600 text-white", icon: AlertOctagon },
  high: { label: "High", row: "border-l-orange-500 bg-orange-50/50", chip: "bg-orange-500 text-white", icon: AlertTriangle },
  medium: { label: "Medium", row: "border-l-yellow-500 bg-yellow-50/40", chip: "bg-yellow-400 text-yellow-950", icon: Bell },
  low: { label: "Low", row: "border-l-slate-300 bg-white", chip: "bg-slate-200 text-slate-700", icon: Info },
};

const STATE: Record<string, { label: string; cls: string }> = {
  AVAILABLE: { label: "Available", cls: "bg-green-100 text-green-800" },
  EN_ROUTE: { label: "On the way", cls: "bg-orange-100 text-orange-800" },
  ON_JOB: { label: "On a job", cls: "bg-purple-100 text-purple-800" },
  NOT_CLOCKED_IN: { label: "Not clocked in", cls: "bg-yellow-100 text-yellow-800" },
  CLOCKED_OUT: { label: "Clocked out", cls: "bg-gray-100 text-gray-600" },
  OFF: { label: "Day off", cls: "bg-gray-100 text-gray-500" },
};

const TECH_STATUS_LABEL: Record<string, string> = {
  EN_ROUTE: "On the way", ARRIVED: "Arrived", DIAGNOSING: "Diagnosing", WAITING_FOR_APPROVAL: "Waiting approval", WORKING: "Working",
};

const boardLink = (a: { appointmentId?: string | null; date?: string }) =>
  `/dispatcher/board?${new URLSearchParams({ ...(a.appointmentId ? { job: a.appointmentId } : {}), ...(a.date ? { date: a.date } : {}) })}`;

export default function CommandCenter() {
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sevFilter, setSevFilter] = useState<AlertSeverity | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dispatch/command", { cache: "no-store" });
      if (!res.ok) throw new Error(res.status === 403 ? "You don't have access to the Command Center." : "Could not load the Command Center.");
      setData(await res.json());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    data?.alerts.forEach((a) => c[a.severity]++);
    return c;
  }, [data]);

  if (!data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh] text-gray-500">
        {error ? <p className="text-red-600">{error}</p> : <Loader2 className="animate-spin" />}
      </div>
    );
  }

  const k = data.kpis;
  const alerts = data.alerts.filter((a) => sevFilter === "all" || a.severity === sevFilter);
  const dateLabel = new Date(data.now).toLocaleDateString("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric" });

  const tiles = [
    { label: "Jobs today", value: k.scheduledToday, icon: CalendarRange, cls: "text-[#1B3FA8] bg-blue-50", href: "/dispatcher/board" },
    { label: "Completed", value: k.completedToday, icon: CheckCircle2, cls: "text-green-700 bg-green-50" },
    { label: "In progress", value: k.inProgress, icon: Wrench, cls: "text-purple-700 bg-purple-50" },
    { label: "On the way", value: k.onTheWay, icon: Truck, cls: "text-orange-700 bg-orange-50" },
    { label: "Needs scheduling", value: k.unassigned, icon: Inbox, cls: "text-red-700 bg-red-50", href: "/dispatcher/board" },
    { label: "Open emergencies", value: k.emergenciesOpen, icon: Siren, cls: "text-red-700 bg-red-50", href: "/dispatcher/emergency" },
    { label: "New calls today", value: k.newCallsToday, icon: PhoneCall, cls: "text-sky-700 bg-sky-50" },
    { label: "Canceled today", value: k.canceledToday, icon: XCircle, cls: "text-gray-600 bg-gray-100" },
    { label: "Collected today", value: money(k.revenueToday), sub: `${k.paymentsToday} payment${k.paymentsToday === 1 ? "" : "s"}`, icon: DollarSign, cls: "text-emerald-700 bg-emerald-50" },
    { label: "Techs clocked in", value: `${k.techsClockedIn}/${k.techsTotal}`, icon: Users, cls: "text-indigo-700 bg-indigo-50", href: "/dispatcher/technicians" },
    { label: "Capacity booked", value: k.utilization == null ? "—" : `${k.utilization}%`, sub: "of today's working hours", icon: Gauge, cls: "text-amber-700 bg-amber-50" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1600px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Command Center</h1>
          <p className="text-sm text-gray-500">{dateLabel} · North Carolina time · updated {time(data.now)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <Link href="/dispatcher/board" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1B3FA8] text-white text-sm font-semibold hover:bg-[#16348c]">
            <CalendarRange size={15} /> Dispatch Board
          </Link>
          <Link href="/dispatcher/appointments/new" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F7921A] text-white text-sm font-semibold hover:bg-[#E07F10]">
            <PlusCircle size={15} /> New Call
          </Link>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-11 gap-3">
        {tiles.map((t) => {
          const body = (
            <div className="bg-white rounded-xl border border-gray-200 p-3 h-full hover:shadow-sm transition-shadow">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${t.cls}`}><t.icon size={16} /></div>
              <p className="text-xl font-black text-gray-900 leading-tight">{t.value}</p>
              <p className="text-[11px] text-gray-500 font-medium">{t.label}</p>
              {t.sub && <p className="text-[10px] text-gray-400">{t.sub}</p>}
            </div>
          );
          return t.href ? <Link key={t.label} href={t.href}>{body}</Link> : <div key={t.label}>{body}</div>;
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Alerts */}
        <section className="xl:col-span-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><Bell size={17} className="text-[#F7921A]" /> Alerts ({data.alerts.length})</h2>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "critical", "high", "medium", "low"] as const).map((s) => (
                <button key={s} onClick={() => setSevFilter(s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${sevFilter === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                  {s === "all" ? `All ${data.alerts.length}` : `${SEV[s].label} ${counts[s]}`}
                </button>
              ))}
            </div>
          </div>
          {alerts.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              <CheckCircle2 size={36} className="mx-auto mb-2 text-green-500" />
              <p className="font-semibold">{data.alerts.length ? "No alerts at this level" : "All clear — nothing needs attention right now"}</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[640px] overflow-y-auto">
              {alerts.map((a) => {
                const s = SEV[a.severity];
                return (
                  <li key={a.id} className={`border-l-4 ${s.row} px-4 py-3 flex items-start gap-3`}>
                    <s.icon size={18} className={`mt-0.5 shrink-0 ${a.severity === "critical" ? "text-red-600" : a.severity === "high" ? "text-orange-500" : a.severity === "medium" ? "text-yellow-600" : "text-slate-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${s.chip}`}>{s.label}</span>
                        <p className="font-semibold text-sm text-gray-900">{a.title}</p>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{a.detail}</p>
                    </div>
                    {(a.appointmentId || a.date) && (
                      <Link href={boardLink(a)} className="shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-[#1B3FA8] hover:bg-blue-50">
                        {a.appointmentNumber ? `#${a.appointmentNumber}` : a.appointmentId ? "Open" : "Open board"}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Technicians */}
        <section className="xl:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><Users size={17} className="text-[#1B3FA8]" /> Technicians</h2>
            <Link href="/dispatcher/technicians" className="text-xs font-semibold text-[#1B3FA8] hover:underline">Profiles</Link>
          </div>
          <ul className="divide-y divide-gray-100 max-h-[640px] overflow-y-auto">
            {data.technicians.length === 0 && <li className="p-6 text-sm text-gray-500 text-center">No active technicians.</li>}
            {data.technicians.map((t) => {
              const st = STATE[t.state];
              return (
                <li key={t.id} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color ?? "#94a3b8" }} />
                    <p className="font-semibold text-sm text-gray-900 truncate">{t.name}</p>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="mt-1 space-y-0.5 text-xs text-gray-600 pl-[18px]">
                    {t.current && (
                      <p><Link href={boardLink({ appointmentId: t.current.id, date: data.today })} className="text-purple-700 font-semibold hover:underline">#{t.current.number}</Link> {t.current.name} · {TECH_STATUS_LABEL[t.current.status ?? ""] ?? t.current.status}</p>
                    )}
                    {t.next && (
                      <p className="flex items-center gap-1"><Clock size={11} /> Next {time(t.next.start)} · <Link href={boardLink({ appointmentId: t.next.id, date: data.today })} className="text-[#1B3FA8] hover:underline">#{t.next.number}</Link> {t.next.name}</p>
                    )}
                    <p className="text-gray-400 flex flex-wrap gap-x-3">
                      <span>{t.jobsDone}/{t.jobsTotal} jobs done</span>
                      {t.utilization != null && <span>{t.utilization}% booked</span>}
                      {t.hours ? <span>{t.hours}</span> : <span>No hours today</span>}
                      {t.clockedAt && <span>In at {time(t.clockedAt)}</span>}
                      {t.lastPingMinutes != null
                        ? <span className="flex items-center gap-0.5"><Navigation size={10} /> GPS {t.lastPingMinutes < 2 ? "now" : `${t.lastPingMinutes} min ago`}</span>
                        : <span>No GPS today</span>}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Activity */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Activity size={17} className="text-gray-500" /> Recent activity</h2>
        </div>
        {data.activity.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">No dispatch activity yet.</p>
        ) : (
          <ul className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {data.activity.map((e) => (
              <li key={e.id} className="px-4 py-2 flex items-start gap-3 text-sm">
                <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">
                  {new Date(e.at).toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" })} {time(e.at)}
                </span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">{e.type.replace(/_/g, " ")}</span>
                <p className="text-gray-700 min-w-0">
                  {e.appointmentNumber && (
                    <Link href={boardLink({ appointmentId: e.appointmentId })} className="font-semibold text-[#1B3FA8] hover:underline mr-1">#{e.appointmentNumber}</Link>
                  )}
                  {e.customer && <span className="text-gray-500 mr-1">{e.customer} —</span>}
                  {e.message}
                  {e.userName && <span className="text-gray-400"> · {e.userName}</span>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
