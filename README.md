# Post-Discharge Companion (hackathon)

Mobile-first **Python-Based Railway** app that turns discharge text into a **Today** plan and **symptom check-in** with escalation guidance.

# CarePost — Project Description

---

## The Problem: Who Gets Left Behind After Discharge

Every year, millions of patients leave hospitals with a stack of papers they can't fully read, understand, or act on. Most of those patients aren't failing — the system is failing them.

Two groups bear the worst of it:

**Elderly patients** are discharged with complex, multi-page after-visit summaries covering wound care, medication schedules, red-flag symptoms, and follow-up appointments. Many have mild cognitive decline, live alone, and have no one to help them parse dense clinical language. A missed wound-dressing step or a skipped follow-up isn't laziness — it's a readability and memory problem. The result is preventable readmissions, medication errors, and complications that compound quickly in older bodies.

**Non-English-speaking patients** face the same document — but in a language they may not read at all. Discharge summaries are almost never translated. Patients nod, take the papers, and go home with no reliable understanding of what they're supposed to do. For recent immigrants, refugees, or elderly patients who primarily speak another language at home, a standard after-visit summary is functionally useless.

Both groups share the same bottleneck: the information exists, but it's locked inside a document designed for clinical staff, not patients.

---

## Our Solution: A Camera as the Sole Entry Point

CarePost asks one thing of the patient or their caregiver: **take a photo**. No app login, no manual data entry, no EHR integration, no hospital portal. The camera is the entire intake flow.

From that single photo, the app extracts, interprets, translates, and organizes everything the patient needs — then delivers it in a format built for their actual situation: large text, plain language, their own language, with urgent items prominently surfaced.

---

## Technical Overview

> See `architecture.excalidraw` for the full architecture diagram (open at excalidraw.com).

Every captured image runs through a **dual-path pipeline** simultaneously:

### Path 1 — OCR + Text Parsing
The raw image is fed to an OCR engine (Tesseract) to extract all text from the document. That raw text is then sent to the Claude API, which semantically parses it into a structured schema — identifying medications, appointment dates, red-flag symptoms, wound care instructions, referrals, and lifestyle restrictions.

### Path 2 — Claude Vision
The same raw image is sent directly to Claude's vision API. Claude identifies non-text content: what a pill looks like (for identification), visible wound state (redness, swelling severity), or medical devices. It returns a label, description, and a severity level: `low`, `moderate`, `high`, or `emergency`.

### Merge → Normalized JSON
Both paths converge into a single **Normalized JSON Schema** — the shared contract for all downstream features. Nothing reads the raw image or raw OCR text after this point. Every feature reads from the same normalized output.

### Feature Layer
From the normalized schema, the app populates seven distinct feature areas:

| Feature | What It Does |
|---|---|
| Return Precautions | Surfaces red-flag symptoms prominently with 911/ER/doctor action buttons |
| Follow-Up Appointments | Shows date, provider, location, what to bring |
| Medications & Pharmacy | Reconciles discharge meds list, flags missing items, shows pickup info |
| Wound & Device Care | Step-by-step checklists for dressing changes, drains, splints |
| Referrals | Specialist type, urgency, whether patient still needs to schedule |
| Symptom Tracking | Daily check-in sliders; trend detection over recovery period |
| Notifications & Reminders | Medication reminders, appointment nudges, severity-gated push alerts |

### Translation Layer
Google Translate wraps every patient-facing output. Language selection re-translates the full content. Red flags are translated first — highest priority.

### Caregiver Mode
A read-only view of all content, accessible to a designated family member or caregiver with explicit patient consent. No write permissions.

---

## What Could Go Wrong — and How to Guard Against It

### 1. OCR misreads critical dosages or medication names
A blurry photo, handwritten note, or unusual font could cause Tesseract to misread "10mg" as "100mg" or garble a drug name entirely.

**Safeguards:**
- Show the patient the raw extracted text alongside the parsed result and ask for a one-tap confirmation ("Does this look right?")
- Flag low-confidence OCR fields visually (yellow highlight, confidence score)
- For medications specifically, cross-reference extracted drug names against a known medication database; surface any names that don't match as "verify with your pharmacist"
- Never auto-schedule medication reminders without explicit patient confirmation of the extracted dose

### 2. Claude vision misidentifies a pill or wound severity
Vision models can hallucinate. Calling a moderate wound "emergency" causes panic; calling an infected wound "low" delays care.

**Safeguards:**
- Frame all visual assessments as guidance, not diagnosis: "This looks like it may be swollen — compare to your discharge photos and call your doctor if concerned"
- Show the patient the image Claude assessed alongside its interpretation
- Emergency severity (`emergency`) triggers a prompt to call 911 — but the patient confirms before any automated action
- Avoid showing severity scores numerically; use plain-language descriptions calibrated with clinical advisors

### 3. Translation errors in high-stakes content
Machine translation of medical language is imperfect. A mistranslation in the red-flags section could cause a patient to dismiss or misunderstand a critical warning.

**Safeguards:**
- Mark translated red-flag content with a "translation may not be perfect — show this to someone who reads English or ask your pharmacist" disclaimer
- Allow the original English text to be shown side-by-side with translation
- Prioritize professional translation review for the red-flags section in high-volume languages

### 4. Notification fatigue causing disengagement
Too many reminders cause patients to mute or uninstall.

**Safeguards:**
- Enforce frequency caps per notification channel
- Respect quiet hours (default: 10pm–7am, patient-configurable)
- Medication reminders use one-tap confirmation ("I took it / Skip / Remind me in 30 min") — no guilt framing
- Reduce reminder frequency automatically if patient consistently confirms on time (positive reinforcement pattern)

### 5. Sensitive health data exposure
Camera images of medical documents, medication lists, and symptom data are among the most sensitive data a person can generate.

**Safeguards:**
- Images are processed server-side and not stored beyond the session unless the patient explicitly saves them
- No data is shared with third parties (insurers, advertisers, employers) — ever
- Caregiver access is revocable by the patient at any time
- On-device OCR as a fallback option (no image upload) for patients who prefer it
- Clear, plain-language privacy policy in all supported languages

---

## Empowering, Not Replacing

CarePost is not a clinical tool. It does not diagnose. It does not prescribe. It does not replace the doctor, the nurse, or the pharmacist.

What it does is close the gap between what the clinical team explained and what the patient actually retains and acts on after they leave.

**The nurse still gives the discharge briefing.** CarePost lets the patient review it again at home, in their own language, at their own pace, without feeling embarrassed to ask a question they forgot.

**The pharmacist still counsels on medications.** CarePost surfaces the medication list so the patient knows what to ask for and what to flag.

**The doctor still sets the follow-up appointment.** CarePost reminds the patient when it's coming, what to bring, and what fasting or prep requirements apply.

The human care team provides the knowledge. CarePost is the scaffolding that helps a nervous, exhausted, or overwhelmed patient actually use it.

For elderly patients who struggle with technology, the camera-first interface is deliberately simple: open the app, point at the paper, tap once. No forms, no typing, no accounts to remember.

For caregivers — an adult child managing a parent's recovery from another city — the read-only caregiver mode means they can stay informed without requiring the patient to relay information accurately over the phone.

---

## Ethical Considerations

**Consent and autonomy.** Every data-sharing decision (caregiver access, notification channels) requires explicit opt-in. Patients can revoke access at any time. The app respects the patient's right to decline features without degrading their core experience.

**Not a diagnostic tool.** The app must never position itself as medical advice. Every visual assessment from Claude vision is framed as an observation to share with a care provider, not a medical conclusion. This distinction is enforced in copy, design, and legal disclaimer.

**Health equity over engagement metrics.** The app's success metric is patient outcomes (readmissions, missed appointments, medication adherence) — not daily active users or session length. Design decisions that drive engagement at the cost of accuracy or trust are out of scope.

**Language justice.** Supporting non-English languages is not a feature — it's a baseline requirement. Patients who don't speak English have the same right to understand their discharge instructions as anyone else. Translation quality in non-major languages should be audited regularly.

**Avoiding surveillance creep.** Symptom tracking data, medication confirmation logs, and check-in patterns could theoretically be useful to insurers or employers. They won't be. Data collected for patient benefit stays with the patient. This needs to be a technical guarantee (no API endpoints that expose this data), not just a policy promise.

**Accessibility.** Large-text mode, screen reader support, and high-contrast UI are not edge cases — they are primary design requirements for the elderly user base.

## Quick start

```bash
npm install
cp .env.example .env.local
# Add ANTHROPIC_API_KEY to .env.local for live LLM extraction and triage
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Without an API key

- Use **Load sample discharge** on **Upload** to populate the **Today** and **Check-in** flows from `fixtures/sample-care-plan.json`.
- **Extract** from pasted text requires `ANTHROPIC_API_KEY`.
- **Check-in** falls back to **demo triage** logic if the API is unavailable (503).

## Project layout

| Path | Purpose |
|------|---------|
| `app/upload` | Paste discharge text, extract via `/api/extract`, or load sample |
| `app/plan` | Today checklist, meds, red flags, plain-language summary |
| `app/check-in` | Symptoms → `/api/check-in` or demo fallback |
| `app/api/extract` | LLM → structured `CarePlan` (Zod-validated) |
| `app/api/check-in` | LLM triage + escalation copy |
| `app/api/sample-care-plan` | Serves fixture JSON |
| `fixtures/` | Sample AVS text + JSON |
| `lib/types/care-plan.ts` | Shared Zod schemas |
| `design/mockups/` | UI reference images |

## Scripts

- `npm run dev` — dev server (Turbopack)
- `npm run build` — production build
- `npm run lint` — ESLint

## Disclaimer

Demo software only — not medical advice. For emergencies, use your local emergency number.
