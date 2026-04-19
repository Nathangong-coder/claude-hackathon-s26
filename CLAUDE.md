# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A healthcare follow-up app that uses a **camera** to capture after-visit summary documents and visual health items (medications, symptoms). Images are processed via OCR for text and Claude's vision API for non-text recognition (pill identification, wound/symptom assessment). Claude interprets the combined data to drive reminders and follow-up actions. **No hospital API integrations** — backend is Python, camera capture is the sole data entry point.

## Tech Stack Decisions

- **Backend**: Python (OCR, Claude API vision + text, business logic)
- **Frontend**: TBD (likely React Native or Next.js — camera access required)
- **OCR**: Tesseract (text extraction from document photos) or equivalent Python OCR library
- **Vision AI**: Claude vision API for non-text recognition (medication identification, symptom/wound severity assessment)
- **Translation**: Google Translate API (for multi-language support)
- **No hospital/EHR API integration** — all data originates from camera captures

---

## Feature Architecture (Frontend / Backend split)

### 1. Camera Capture & Document Parsing
- **Backend**: Two-path processing pipeline for every captured image:
  1. **Text path**: Run OCR (Tesseract) on the image to extract raw text from the after-visit summary document. Feed OCR output to Claude API to semantically parse into a normalized JSON schema (return precautions, appointments, medications, wound care, referrals, lifestyle instructions).
  2. **Visual recognition path**: Send the raw image directly to Claude vision API to identify non-text content — pill/medication appearance, visible symptoms (redness, swelling, wound state), or medical devices. Claude returns an identification label, description, and a severity/urgency level (`low` / `moderate` / `high` / `emergency`).
  Both outputs are merged into the same normalized JSON before being passed downstream to all other features.
- **Frontend**: In-app camera view with capture button (no gallery picker — live capture only for data freshness). Scan mode selector: "Document" (after-visit summary) vs. "Item" (medication or symptom photo). Processing indicator during OCR + vision analysis. Error states for blurry/unreadable captures with retake prompt.

### 2. Return Precautions ("Red Flags")
- **Backend**: Extract red-flag symptoms from parsed PDF. Run through Google Translate API when a non-English language is selected.
- **Frontend**: High-visibility card (prominent placement, bold/red styling). Language selector that triggers re-translation. "Call 911 / Go to ER / Call doctor" action buttons per symptom.

### 3. Follow-Up Appointments
- **Backend**: Parse appointment dates, locations, providers, and "what to bring" instructions from PDF. Expose as structured list.
- **Frontend**: Appointment cards with date, provider, location, and checklist of what to bring (fasting requirements, prior records). Calendar export option.

### 4. Wound / Device Care
- **Backend**: Extract step-by-step wound/device care instructions (dressing changes, drains, ostomy, splints).
- **Frontend**: Step-by-step checklist UI, photo-friendly layout. Checkboxes persist locally per session.

### 5. Referrals
- **Backend**: Extract specialist referrals with urgency, reason, and scheduling status.
- **Frontend**: Referral cards showing specialist type, reason, urgency level, and whether patient still needs to schedule.

### 6. Symptom & Recovery Tracking
- **Backend**: Define trackable symptom dimensions from the PDF (pain, breathing, swelling, etc.). Store daily check-in data. Detect trends.
- **Frontend**: Daily slider/checkbox check-in UI. Trend visualization (simple chart). Optional share-with-care-team export.

### 7. Medications & Pharmacy
- **Backend**: Extract current medication list from PDF, reconcile against discharge instructions. Extract pharmacy info, copay notes, OTC/supplement guidance.
- **Frontend**: Medication reconciliation list ("these are the meds you should have now — flag anything different"). Pharmacy card with pickup expectations and copay info. OTC/supplement allowed/discouraged flags.

### 8. Lifestyle & Education
- **Backend**: Extract diet restrictions (fluid/sodium/renal-cardiac), activity limits (walking, lifting, driving, return-to-work), substance use guidance. Surface relevant education content tied to diagnosis.
- **Frontend**: Structured sections per category. Activity restriction cards with specific limits (not generic). Linked education snippets (articles/videos) by diagnosis keyword.

### 9. Logistics & Accessibility
- **Backend**: Extract transportation/parking notes for follow-up visits. Support caregiver delegation (read-only mode with consent flag).
- **Frontend**: Large text / screen reader support. Multi-language content (Google Translate). Caregiver mode toggle (read-only delegated view).

### 10. Notifications & Engagement
- **Backend**: Schedule medication reminders and appointment nudges. Respect quiet hours and frequency caps. Support push / SMS / email channels.
- **Frontend**: Notification preferences UI (channel choice, quiet hours). Low-friction check-in prompts ("Did you take your morning meds?" — one-tap). Avoid guilt-heavy copy.

---

## Key Architectural Constraints

- All patient data originates from camera captures — no external health record lookups.
- The normalized JSON from the OCR + vision pipeline is the shared contract between backend features and frontend components.
- The two-path pipeline (OCR text + Claude vision) always runs concurrently on every captured image; results are merged before any feature reads them.
- Severity levels from visual recognition (`low` / `moderate` / `high` / `emergency`) gate notification urgency — `emergency` triggers immediate push regardless of quiet hours.
- Translation applies to red flags first (highest priority), then other content.
- Caregiver mode is read-only — no write permissions without explicit patient consent.
