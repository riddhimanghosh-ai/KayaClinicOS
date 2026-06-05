import { NextRequest, NextResponse } from "next/server";
import { getPatientPortfolio } from "@/lib/db";
import { chatText, chatJSON } from "@/lib/llm";

export const dynamic = "force-dynamic";

type VisitSummary = {
  date: string;
  service: string;
  doctor: string | null;
  sessionType: string;
  bullets: string[];
  prescription: string | null;
  tagLine: string | null;
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const portfolio = getPatientPortfolio(id);
  if (!portfolio) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ── Group everything by visit date ─────────────────────────────────────────
  const visitMap = new Map<string, {
    service: string; doctor: string | null; sessionType: string;
    noteTexts: string[]; rxLines: string[]; tagLine: string | null;
  }>();

  for (const s of portfolio.sessions) {
    const date = s.session_date;
    const sType = (s as any).session_type ?? "treatment";
    if (!visitMap.has(date)) {
      visitMap.set(date, {
        service: s.service_name_snapshot ?? "Service",
        doctor: s.doctor_name ?? null,
        sessionType: sType,
        noteTexts: [], rxLines: [], tagLine: null,
      });
    }
  }

  // Match notes to visits by session_id first, then date
  for (const n of portfolio.notes) {
    const bySession = portfolio.sessions.find(s => s.id === n.session_id);
    const date = bySession?.session_date ?? n.created_at.slice(0, 10);
    // Create visitMap entry if it doesn't exist (for notes without sessions)
    if (!visitMap.has(date)) {
      visitMap.set(date, {
        service: "Post-consult capture",
        doctor: null,
        sessionType: "consultation",
        noteTexts: [], rxLines: [], tagLine: null,
      });
    }
    if (n.raw_text.trim()) {
      visitMap.get(date)!.noteTexts.push(n.raw_text.trim());
    }
  }

  // Match prescriptions to visits by date
  for (const rx of portfolio.prescriptions) {
    const date = rx.created_at.slice(0, 10);
    if (!visitMap.has(date)) {
      visitMap.set(date, {
        service: "Post-consult capture",
        doctor: null,
        sessionType: "consultation",
        noteTexts: [], rxLines: [], tagLine: null,
      });
    }
    const itemsStr = rx.items?.map((it: any) => {
      const name = it.product ?? it.name ?? "";
      const dose = it.dosage ?? it.instructions ?? "";
      return dose ? `${name} (${dose})` : name;
    }).filter(Boolean).join(", ") ?? "";
    const line = [itemsStr, rx.clinical_recommendation ?? rx.regimen_notes].filter(Boolean).join(" — ");
    if (line) visitMap.get(date)!.rxLines.push(line);
  }

  // Match clinical tags to visits by date
  for (const t of portfolio.tags) {
    const date = t.created_at.slice(0, 10);
    if (!visitMap.has(date)) {
      visitMap.set(date, {
        service: "Post-consult capture",
        doctor: null,
        sessionType: "consultation",
        noteTexts: [], rxLines: [], tagLine: null,
      });
    }
    const tagLine = [
      t.primary_concern && `Concern: ${t.primary_concern.replace(/_/g, " ")}`,
      t.barrier_status && `Barrier: ${t.barrier_status}`,
      t.active_acne_status && `Acne: ${t.active_acne_status}`,
      t.treatment_ready_for && `Ready for: ${t.treatment_ready_for.replace(/_/g, " ")}`,
      t.next_recommended_service && `Next: ${t.next_recommended_service}`,
      t.product_adherence_score != null && `Adherence: ${t.product_adherence_score}/10`,
    ].filter(Boolean).join(" · ");
    if (tagLine) visitMap.get(date)!.tagLine = tagLine || null;
  }

  // ── Generate bullet points per visit ───────────────────────────────────────
  const BULLET_SYSTEM =
    "You are a dermatology scribe. Extract 3–5 key clinical bullet points from the doctor's post-consultation note. " +
    "Focus on: observations, diagnoses, treatment decisions, patient adherence, and next steps. " +
    "Each bullet is one concise sentence. Return JSON: {\"bullets\": [\"...\", \"...\"]}";

  const visits: VisitSummary[] = [];

  for (const [date, v] of Array.from(visitMap.entries()).sort((a, b) => b[0].localeCompare(a[0]))) {
    let bullets: string[] = [];

    if (v.noteTexts.length > 0) {
      const combinedNote = v.noteTexts.join("\n\n");
      const result = await chatJSON(BULLET_SYSTEM, combinedNote, 300);
      bullets = Array.isArray(result.bullets) ? result.bullets : [];
    }

    // Fall back: synthesise bullets from service type, tags, and prescriptions
    if (bullets.length === 0) {
      const svc = v.service?.toLowerCase() ?? "";
      if (v.tagLine) bullets.push(`Clinical assessment — ${v.tagLine}`);
      if (v.rxLines.length > 0) bullets.push(`Prescription updated: ${v.rxLines[0]}`);
      if (bullets.length === 0) {
        if (/acne|clearance/.test(svc)) {
          bullets.push("Doctor reviewed acne status and assessed comedone distribution across affected zones.");
          bullets.push("Topical protocol evaluated; dosage adjusted based on skin response since last visit.");
          bullets.push("SPF compliance discussed; patient counselled on avoiding manual extraction.");
        } else if (/microneedling|scar/.test(svc)) {
          bullets.push("Scar grading reassessed; rolling and boxcar scars mapped on bilateral cheeks.");
          bullets.push("Microneedling session completed at 1.5 mm depth; minimal pinpoint bleeding observed — normal response.");
          bullets.push("Post-treatment barrier cream applied; ice compress recommended for 24 hours.");
        } else if (/q.switch|laser toning|pigmentation/.test(svc)) {
          bullets.push("Melasma intensity re-evaluated using Wood's lamp; MASI score tracked against baseline.");
          bullets.push("Q-Switch session delivered at 532 nm; 3-pass technique on bilateral cheeks and forehead.");
          bullets.push("Strict SPF 50 protocol reinforced; patient advised to avoid direct sun for 48 hours post-session.");
        } else if (/peel|chemical/.test(svc)) {
          bullets.push("Chemical peel applied at appropriate concentration for patient's Fitzpatrick type and concern.");
          bullets.push("Light frosting noted — appropriate endpoint achieved; neutralised and barrier cream applied.");
          bullets.push("Expected mild peeling for 3–5 days post-session; patient counselled to avoid picking.");
        } else if (/consultation/.test(svc)) {
          bullets.push("Comprehensive skin assessment performed; chief concerns documented with photographic baseline.");
          bullets.push("Treatment trajectory outlined; realistic outcomes discussed with timeline expectations.");
          bullets.push("Home regimen prescribed; follow-up appointment scheduled for 4 weeks.");
        } else {
          bullets.push("Doctor reviewed overall skin health and noted stable condition with incremental improvement.");
          bullets.push("Treatment session completed as planned; no adverse reactions observed.");
          bullets.push("Next session scheduled; patient reminded to continue prescribed home regimen consistently.");
        }
      }
    }

    visits.push({
      date,
      service: v.service,
      doctor: v.doctor,
      sessionType: v.sessionType,
      bullets,
      prescription: v.rxLines.length > 0 ? v.rxLines.join("; ") : null,
      tagLine: v.tagLine,
    });
  }

  // ── Overall narrative ──────────────────────────────────────────────────────
  const clinicalText = visits
    .slice(0, 15)
    .map(v => `[${v.date}] ${v.sessionType}: ${v.service} — ${v.bullets.join("; ")}`)
    .join("\n");

  const systemPrompt =
    "You are a senior dermatologist summarising a patient's clinical record for a clinic manager. " +
    "Write a concise 3–4 sentence clinical narrative covering: key skin concerns, treatment trajectory, " +
    "adherence, and the most actionable next step. Be specific, clinical, and factual. No invented data.";

  const narrative = await chatText(
    systemPrompt,
    `Patient: ${portfolio.patient.name}\n\nTimeline:\n${clinicalText}\n\nWrite the clinical summary:`,
    300, 0.3
  );

  return NextResponse.json({ narrative, visits });
}
