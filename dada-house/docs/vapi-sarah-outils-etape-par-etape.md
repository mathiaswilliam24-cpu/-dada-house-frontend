# Sarah (Vapi) — créer les outils, étape par étape

16 outils en tout. Fais-les dans cet ordre : préparation → groupe A (3 natifs) → groupe B (5 du backend Render)
→ groupe C (8 de dada-house.com) → attacher tout à Sarah → tester.

---

## Étape 0 — Préparation (une seule fois)

1. **La clé.** Récupère la clé Bearer à utiliser pour le groupe C :
   - soit la valeur de `DADA_HOUSE_API_KEY` (Vercel → projet dada-house → Settings → Environment Variables),
   - soit la nouvelle `VAPI_TOOLS_KEY` (quand elle sera créée et déployée).
2. **La credential dans Vapi** (pour ne pas recopier la clé 8 fois) :
   Vapi → **Integrations / Credentials → Custom Credential → Bearer Token**
   - Nom : `DADA HOUSE tools`
   - Token : la clé de l'étape 1 (sans le mot « Bearer »)
   - Header : `Authorization` (Vapi ajoute « Bearer » devant)
   Si ton tableau de bord ne propose pas ce type, ajoute à chaque outil du groupe C un **header**
   `Authorization` = `Bearer <la clé>`.
3. Pour chaque outil de type **Function** : laisse **Async = OFF** (Sarah doit attendre la réponse).

---

## Étape 1 — Groupe A : outils natifs Vapi (3)

Vapi → **Tools → Create Tool**.

### 1.1 `transferCall` — transfert vers les dispatchers
- Type : **Transfer Call**
- Name : `transferCall`
- Description : `Transfer the caller to the DADA HOUSE team (dispatchers). Use only when the caller asks for a person, when you have no answer, or when a tool failed twice.`
- Destination : **Number** → `+18326264398` (ligne dispatch — **jamais** le 844, ça bouclerait sur Sarah)
- Message avant transfert : `Of course, one moment — I'm connecting you now.`
- Caller ID / « Transfer Plan » : garder le **numéro de l'appelant** (pour que les dispatchers voient qui appelle)

### 1.2 `transferToEmergency` — urgences
- Type : **Transfer Call**
- Name : `transferToEmergency`
- Description : `Emergency transfer. Use immediately, before anything else, when the caller presses 1, says emergency/urgent/urgente, or describes a danger (gas smell, CO alarm, smoke, sparks, flooding, burst pipe, no heat in freezing weather, someone unwell from heat or cold).`
- Destination : **Number** → `+18326264398` (ligne dispatch : les urgences font sonner les dispatchers — confirmé 2026-11-21)
- Message : `I understand — I'm connecting you with our technician right now.`

### 1.3 `endCall`
- Type : **End Call**
- Name : `endCall`
- Description : `End the call after the closing sentence.`

---

## Étape 2 — Groupe B : outils du backend Render (5)

Ces 5 outils existent déjà sur l'assistante **Emma**. Si tu les vois dans **Tools**, ne les recrée pas :
passe à l'étape 4 et attache-les à Sarah. Sinon crée-les ainsi :

- Type : **Function**
- Server URL (les 5) : `https://dada-house-backend.onrender.com/vapi/webhook`
- Pas de header d'autorisation (c'est le backend qui détient la clé).

Collez le bloc **Parameters** dans l'éditeur JSON de l'outil.

### 2.1 `getCurrentDate`
Description : `Get today's date, tomorrow's date and the exact dates of the next weekdays. ALWAYS call this before working with any date ("tomorrow", "next Monday"...).`
```json
{ "type": "object", "properties": {}, "required": [] }
```

### 2.2 `validateAddress`
Description : `Validate and format a service address. Returns the formatted address if found.`
```json
{
  "type": "object",
  "properties": {
    "address": { "type": "string", "description": "Full service address, e.g. '123 Main St, Houston, TX'" }
  },
  "required": ["address"]
}
```

### 2.3 `getAvailableSlots`
Description : `Get the available 2-hour arrival windows for a date and a service. Offer only the windows returned.`
```json
{
  "type": "object",
  "properties": {
    "date": { "type": "string", "description": "YYYY-MM-DD" },
    "service_type": { "type": "string", "description": "Same value as createAppointment.service_type" }
  },
  "required": ["date"]
}
```

### 2.4 `checkAvailability`
Description : `Check whether the time the caller asked for is available; the result gives the real arrival window and alternatives.`
```json
{
  "type": "object",
  "properties": {
    "date": { "type": "string", "description": "YYYY-MM-DD" },
    "time": { "type": "string", "description": "Time the caller asked for, HH:MM 24-hour" },
    "durationMinutes": { "type": "number", "description": "Default 60" },
    "service_type": { "type": "string", "description": "Same value as createAppointment.service_type" }
  },
  "required": ["date", "time"]
}
```

### 2.5 `createAppointment`
Description : `Create the appointment after the caller confirmed the recap. Sends the confirmation text and email. Never say it's booked unless this succeeds.`
```json
{
  "type": "object",
  "properties": {
    "client_name": { "type": "string", "description": "Caller's full name" },
    "phone": { "type": "string", "description": "Phone with country code, e.g. +15551234567" },
    "email": { "type": "string", "description": "Email address (optional)" },
    "address": { "type": "string", "description": "Full service address (validated)" },
    "service_type": {
      "type": "string",
      "enum": ["Air Conditioning Repair", "Air Conditioning Installation", "Heating Repair", "Heating Installation",
               "Plumbing Services", "Water Heater Repair", "Water Heater Replacement", "Remodeling",
               "Preventive Maintenance", "Emergency Service"]
    },
    "problem_description": { "type": "string", "description": "What is happening, in the caller's words" },
    "appointment_date": { "type": "string", "description": "YYYY-MM-DD" },
    "appointment_time": { "type": "string", "description": "Start of the chosen window, HH:MM 24-hour" },
    "language": { "type": "string", "enum": ["en", "fr", "es"] }
  },
  "required": ["client_name", "phone", "address", "service_type", "appointment_date", "appointment_time"]
}
```

---

## Étape 3 — Groupe C : outils de dada-house.com (8)

Pour **chacun** :
- Type : **Function**
- Server URL : celle indiquée
- Credential : `DADA HOUSE tools` (ou header `Authorization: Bearer <clé>`)
- Parameters : le bloc JSON

### 3.1 `company_info`
- URL : `https://dada-house.com/api/voice-agent/company-info`
- Description : `Facts about DADA HOUSE (services, service areas, hours, service call fees, maintenance plan, payments, warranty, policies, contacts). Call it before answering ANY question about the company and answer only from what it returns.`
```json
{
  "type": "object",
  "properties": {
    "question": { "type": "string", "description": "The caller's question, in English" }
  },
  "required": ["question"]
}
```

### 3.2 `log_unanswered_question`
- URL : `https://dada-house.com/api/voice-agent/unanswered`
- Description : `Log a question you could not answer from your tools, so the office can answer it. Call it before offering the transfer.`
```json
{
  "type": "object",
  "properties": {
    "question": { "type": "string", "description": "The caller's question" },
    "callerPhone": { "type": "string", "description": "The caller's number ({{customer.number}})" },
    "callerName": { "type": "string", "description": "Caller's name if known" }
  },
  "required": ["question", "callerPhone"]
}
```

### 3.3 `customer_jobs`
- URL : `https://dada-house.com/api/voice-agent/customer-jobs`
- Description : `Existing customer: list their appointments/jobs (status, date, window, technician, tracking, unpaid invoices), text a payment link, reschedule or cancel. Share nothing until verified is true.`
```json
{
  "type": "object",
  "properties": {
    "callerPhone": { "type": "string", "description": "The caller's number ({{customer.number}})" },
    "name": { "type": "string", "description": "Name given by the caller" },
    "address": { "type": "string", "description": "Street address, if the tool asks for it" },
    "zip": { "type": "string", "description": "ZIP code, if the tool asks for it" },
    "action": { "type": "string", "enum": ["list", "send_payment_link", "reschedule", "cancel"] },
    "appointmentNumber": { "type": "string", "description": "For reschedule / cancel" },
    "documentNumber": { "type": "string", "description": "Invoice/estimate number for send_payment_link" },
    "slotStart": { "type": "string", "description": "Start of the new window (ISO, from the availability tool) for reschedule" },
    "reason": { "type": "string", "description": "Reason for cancel / reschedule" }
  },
  "required": ["callerPhone", "name", "action"]
}
```

### 3.4 `lookup_customer`
- URL : `https://dada-house.com/api/voice-agent/customer`
- Description : `Maintenance plan member lookup: verifies the caller and returns their homes, plan and tune-up visits (canBook). Share nothing until verified is true.`
```json
{
  "type": "object",
  "properties": {
    "callerPhone": { "type": "string", "description": "The caller's number ({{customer.number}})" },
    "name": { "type": "string", "description": "Name given by the caller" },
    "address": { "type": "string", "description": "Street address, if asked" },
    "zip": { "type": "string", "description": "ZIP code, if asked" }
  },
  "required": ["callerPhone", "name"]
}
```

### 3.5 `maintenance_availability`
- URL : `https://dada-house.com/api/voice-agent/availability`
- Description : `Available 2-hour windows (8 AM–4 PM) for maintenance tune-ups. Offer up to 3 windows exactly as returned; use slotStart from the result to book.`
```json
{
  "type": "object",
  "properties": {
    "jobType": { "type": "string", "enum": ["MAINTENANCE"] },
    "date": { "type": "string", "description": "First date to search, YYYY-MM-DD" },
    "days": { "type": "number", "description": "How many days to search (default 3, max 14)" },
    "limit": { "type": "number", "description": "Max windows returned (default 6)" }
  },
  "required": ["jobType", "date"]
}
```

### 3.6 `maintenance_visit`
- URL : `https://dada-house.com/api/voice-agent/maintenance`
- Description : `Book, reschedule or cancel a maintenance plan tune-up (one home: visitId + slotStart; several homes: visits). Canceling a visit never cancels the plan.`
```json
{
  "type": "object",
  "properties": {
    "action": { "type": "string", "enum": ["book", "reschedule", "cancel"] },
    "customerId": { "type": "string", "description": "From lookup_customer" },
    "visitId": { "type": "string", "description": "From lookup_customer (one home)" },
    "slotStart": { "type": "string", "description": "From maintenance_availability" },
    "visits": {
      "type": "array",
      "description": "Several homes at once",
      "items": {
        "type": "object",
        "properties": { "visitId": { "type": "string" }, "slotStart": { "type": "string" } },
        "required": ["visitId", "slotStart"]
      }
    },
    "visitIds": { "type": "array", "items": { "type": "string" }, "description": "Several visits, same slotStart" },
    "notes": { "type": "string" },
    "reason": { "type": "string", "description": "Reason for cancel" },
    "vapiCallId": { "type": "string", "description": "The call id ({{call.id}})" }
  },
  "required": ["action", "customerId"]
}
```

### 3.7 `maintenance_plan_info`
- URL : `https://dada-house.com/api/voice-agent/plan`
- Description : `Maintenance plan benefits, prices and a quote for the caller's homes/systems, with today's active promotions. Use only what it returns.`
```json
{
  "type": "object",
  "properties": {
    "systems": { "type": "number", "description": "Number of systems (one home)" },
    "systemsPerHome": { "type": "array", "items": { "type": "number" }, "description": "Systems at each home, e.g. [2, 1]" },
    "billing": { "type": "string", "enum": ["annual", "monthly"] },
    "promoCode": { "type": "string" }
  },
  "required": []
}
```

### 3.8 `register_maintenance_plan`
- URL : `https://dada-house.com/api/voice-agent/enrollment`
- Description : `Register a new maintenance plan customer after a confirmed recap. Texts and emails a secure link to review and pay. The plan is NOT active until payment.`
```json
{
  "type": "object",
  "properties": {
    "firstName": { "type": "string" },
    "lastName": { "type": "string" },
    "phone": { "type": "string", "description": "Mobile number" },
    "email": { "type": "string" },
    "address": { "type": "string", "description": "Street address of the first home" },
    "apt": { "type": "string" },
    "city": { "type": "string" },
    "state": { "type": "string", "description": "2 letters, e.g. TX" },
    "zipCode": { "type": "string", "description": "5 digits" },
    "systems": { "type": "number", "description": "Systems at the first home" },
    "billing": { "type": "string", "enum": ["annual", "monthly"] },
    "language": { "type": "string", "enum": ["en", "fr", "es"] },
    "promoCode": { "type": "string" },
    "systemTypes": { "type": "string", "description": "e.g. 'central AC + furnace'" },
    "billingAddress": { "type": "string" },
    "billingCity": { "type": "string" },
    "billingState": { "type": "string" },
    "billingZip": { "type": "string" },
    "homes": {
      "type": "array",
      "description": "Every home when there are several (including the first)",
      "items": {
        "type": "object",
        "properties": {
          "address": { "type": "string" }, "apt": { "type": "string" }, "city": { "type": "string" },
          "state": { "type": "string" }, "zipCode": { "type": "string" }, "systems": { "type": "number" },
          "nickname": { "type": "string" }
        },
        "required": ["address", "city", "state", "zipCode", "systems"]
      }
    },
    "vapiCallId": { "type": "string", "description": "The call id ({{call.id}})" }
  },
  "required": ["firstName", "lastName", "phone", "email", "address", "city", "state", "zipCode", "systems"]
}
```

---

## Étape 4 — Attacher les outils à Sarah

1. Vapi → **Assistants → Sarah → Tools** : coche les **16** outils.
2. **Model → System prompt** : colle le prompt de `docs/vapi-sarah.md` (section 2).
3. **Analysis → Summary prompt** : colle le texte en français de `docs/vapi-sarah.md`.
4. **Advanced → Server URL** de l'assistant : `https://dada-house-backend.onrender.com/vapi/webhook`
   (c'est ce qui envoie le compte rendu de fin d'appel à DADA HOUSE).
5. **Publish**.

## Étape 5 — Le numéro

Vapi → **Phone Numbers → Import → Twilio** → `+18449280875` → assistant **Sarah**.
(Rollback : dans Twilio, remettre la voice URL du 844 sur `https://dada-house.com/api/twilio/voice/incoming`.)

## Étape 6 — Tester (dans cet ordre)

1. « Quels sont vos frais de déplacement ? » → doit appeler `company_info` ($99 / $139 / $69).
2. Une question bizarre (« vous faites des piscines ? ») → `log_unanswered_question`, visible dans Admin → AI Receptionist.
3. Prendre un rendez-vous de réparation → `getCurrentDate` → `getAvailableSlots` → `createAppointment` (texto reçu).
4. Rappeler du même numéro : « où en est mon rendez-vous ? » → `customer_jobs`.
5. « Combien coûte le plan d'entretien ? » → `maintenance_plan_info` ($199/an ou $19/mois).
6. « Je veux parler à quelqu'un » → `transferCall` → les téléphones des dispatchers sonnent.
7. Raccrocher → texto de compte rendu à l'admin.

Si un outil du groupe C répond **401 Unauthorized** → la clé Bearer est fausse (étape 0).
