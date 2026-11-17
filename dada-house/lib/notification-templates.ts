/**
 * Customer text messages in English, French and Spanish. Defaults live here; managers can
 * override any text or turn a message off (Setting "notify.templates"). The customer's
 * language comes from Customer.preferredLanguage ("en" | "fr" | "es"), English otherwise.
 * Pure module (no db) so the settings page can show defaults and previews.
 */

export const LANGS = ["en", "fr", "es"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_LABEL: Record<Lang, string> = { en: "English", fr: "Français", es: "Español" };

export const TEMPLATE_VARS: Record<string, string> = {
  name: "Customer first name",
  number: "Job number",
  service: "Service",
  date: "Visit date",
  window: "Arrival window",
  tech: "Technician first name",
  link: "Tracking link",
  phone: "Business phone",
};

type Def = { label: string; when: string; vars: string[]; text: Record<Lang, string> };

export const TEMPLATE_DEFS = {
  BOOKING_CONFIRMED: {
    label: "Booking received",
    when: "A new appointment is booked (website, phone, AI receptionist).",
    vars: ["name", "number", "service", "date", "window"],
    text: {
      en: "DADA HOUSE: Hi {name}, we received your {service} appointment #{number} for {date}{window}. We'll text you when it's confirmed. Questions? Call {phone}.",
      fr: "DADA HOUSE : Bonjour {name}, nous avons bien reçu votre rendez-vous {service} n°{number} pour le {date}{window}. Nous vous enverrons un SMS de confirmation. Questions ? Appelez le {phone}.",
      es: "DADA HOUSE: Hola {name}, recibimos su cita de {service} #{number} para el {date}{window}. Le enviaremos un mensaje cuando esté confirmada. ¿Preguntas? Llame al {phone}.",
    },
  },
  JOB_SCHEDULED: {
    label: "Visit scheduled / rescheduled",
    when: "A dispatcher schedules or moves the visit and chooses to text the customer.",
    vars: ["name", "number", "date", "window"],
    text: {
      en: "DADA HOUSE: Your appointment #{number} is scheduled for {date}{window}. Reply to this message if you need anything.",
      fr: "DADA HOUSE : Votre rendez-vous n°{number} est prévu le {date}{window}. Répondez à ce message si vous avez besoin de quoi que ce soit.",
      es: "DADA HOUSE: Su cita #{number} está programada para el {date}{window}. Responda a este mensaje si necesita algo.",
    },
  },
  JOB_CANCELED: {
    label: "Visit canceled",
    when: "A dispatcher cancels the visit and chooses to text the customer.",
    vars: ["name", "number"],
    text: {
      en: "DADA HOUSE: Your appointment #{number} has been canceled. Reply to this message or call {phone} to reschedule.",
      fr: "DADA HOUSE : Votre rendez-vous n°{number} a été annulé. Répondez à ce message ou appelez le {phone} pour le reprogrammer.",
      es: "DADA HOUSE: Su cita #{number} ha sido cancelada. Responda a este mensaje o llame al {phone} para reprogramarla.",
    },
  },
  TECH_EN_ROUTE: {
    label: "Technician on the way",
    when: "The technician taps “On the way” in the app.",
    vars: ["name", "tech", "link"],
    text: {
      en: "DADA HOUSE: Hi {name}! {tech} is on the way. Track live: {link}. Questions? Call {phone}.",
      fr: "DADA HOUSE : Bonjour {name} ! {tech} est en route. Suivez-le en direct : {link}. Questions ? Appelez le {phone}.",
      es: "DADA HOUSE: ¡Hola {name}! {tech} va en camino. Sígalo en vivo: {link}. ¿Preguntas? Llame al {phone}.",
    },
  },
  TECH_ARRIVED: {
    label: "Technician arrived",
    when: "The technician taps “Arrived”.",
    vars: ["name", "tech"],
    text: {
      en: "DADA HOUSE: {tech} has arrived at your location. Thank you!",
      fr: "DADA HOUSE : {tech} est arrivé chez vous. Merci !",
      es: "DADA HOUSE: {tech} ha llegado a su domicilio. ¡Gracias!",
    },
  },
  NEED_RESCHEDULE: {
    label: "Visit needs a new time",
    when: "The technician marks the job “Need reschedule”.",
    vars: ["name", "number"],
    text: {
      en: "DADA HOUSE: Hi {name}, your appointment #{number} needs to be rescheduled. We'll contact you shortly to set a new time.",
      fr: "DADA HOUSE : Bonjour {name}, votre rendez-vous n°{number} doit être reprogrammé. Nous vous contacterons très bientôt pour fixer un nouvel horaire.",
      es: "DADA HOUSE: Hola {name}, su cita #{number} necesita reprogramarse. Nos comunicaremos con usted pronto para fijar un nuevo horario.",
    },
  },
  MAINTENANCE_DUE: {
    label: "Maintenance tune-up due",
    when: "Sent from Maintenance Visits to invite a member to book their included tune-up.",
    vars: ["name", "service"],
    text: {
      en: "DADA HOUSE: Hi {name}, your included {service} is due. Reply with a day that works for you or call {phone} and we'll schedule it.",
      fr: "DADA HOUSE : Bonjour {name}, votre {service} inclus dans votre abonnement est à planifier. Répondez avec le jour qui vous convient ou appelez le {phone}.",
      es: "DADA HOUSE: Hola {name}, su {service} incluido en su plan está pendiente. Responda con el día que le convenga o llame al {phone} y lo programamos.",
    },
  },
} satisfies Record<string, Def>;

export type TemplateKey = keyof typeof TEMPLATE_DEFS;
export const TEMPLATE_KEYS = Object.keys(TEMPLATE_DEFS) as TemplateKey[];

export const SEASON_SERVICE: Record<string, Record<Lang, string>> = {
  SPRING_AC: { en: "spring AC tune-up", fr: "entretien de climatisation de printemps", es: "mantenimiento de aire acondicionado de primavera" },
  FALL_HEATING: { en: "fall heating tune-up", fr: "entretien de chauffage d'automne", es: "mantenimiento de calefacción de otoño" },
};

export type TemplateOverrides = {
  phone?: string;
  templates?: Partial<Record<TemplateKey, { enabled?: boolean; text?: Partial<Record<Lang, string>> }>>;
};

export const DEFAULT_BUSINESS_PHONE = "(844) 928-0875";

export function asLang(v: string | null | undefined): Lang {
  const l = (v ?? "").toLowerCase().slice(0, 2);
  return (LANGS as readonly string[]).includes(l) ? (l as Lang) : "en";
}

const LOCALE: Record<Lang, string> = { en: "en-US", fr: "fr-FR", es: "es-US" };

/** "Tue, Nov 18" / "mar. 18 nov." / "mar, 18 de nov" in North Carolina time. */
export function localDate(d: Date, lang: Lang) {
  return d.toLocaleDateString(LOCALE[lang], { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" });
}

/** Converts an "8 AM - 10 AM" arrival window to the customer's language. */
export function localWindow(window: string | null | undefined, lang: Lang) {
  if (!window) return "";
  const conv = (h: string, m: string | undefined, ap: string) => {
    let hh = Number(h) % 12;
    if (ap.toUpperCase() === "PM") hh += 12;
    if (lang === "fr") return `${hh}h${m ? m : ""}`;
    if (lang === "es") return `${Number(h)}:${m ?? "00"} ${ap.toUpperCase() === "PM" ? "p. m." : "a. m."}`;
    return `${Number(h)}${m ? `:${m}` : ""} ${ap.toUpperCase()}`;
  };
  const parts = window.split(/\s*[-–]\s*/).map((p) => p.replace(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i, (_, h, m, ap) => conv(h, m, ap)));
  if (parts.length !== 2) return `, ${parts.join(" ")}`;
  if (lang === "fr") return `, entre ${parts[0]} et ${parts[1]}`;
  if (lang === "es") return `, entre las ${parts[0]} y las ${parts[1]}`;
  return `, between ${parts[0]} and ${parts[1]}`;
}

export function templateText(key: TemplateKey, lang: Lang, o: TemplateOverrides) {
  const custom = o.templates?.[key]?.text?.[lang];
  return custom && custom.trim() ? custom : TEMPLATE_DEFS[key].text[lang];
}

export function isEnabled(key: TemplateKey, o: TemplateOverrides) {
  return o.templates?.[key]?.enabled !== false;
}

export function fillTemplate(text: string, vars: Record<string, string | null | undefined>, phone: string) {
  return text
    .replace(/\{(\w+)\}/g, (_, k: string) => (k === "phone" ? phone : vars[k] ?? ""))
    .replace(/\s+([.,])/g, "$1") // keeps French spacing before ? ! :
    .replace(/\.\./g, ".")
    .replace(/ {2,}/g, " ")
    .trim();
}
