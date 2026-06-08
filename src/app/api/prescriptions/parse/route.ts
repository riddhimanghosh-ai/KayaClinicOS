import { NextRequest, NextResponse } from "next/server";
import { lookupCatalogPrice } from "@/lib/db";
import type { RxRow } from "@/lib/types";

const SYSTEM = `You are a clinical assistant for Kaya Skin Clinic, a dermatology and trichology chain in India.
Your ONLY job is to extract a structured prescription from a doctor's dictation and return valid JSON.

The doctor speaks in English, Hindi, or Hinglish. Always output ALL fields in English only.

Return ONLY this JSON — no markdown, no prose, no explanation:
{
  "clinical_recommendation": string,
  "items": [
    {
      "problem": string | null,
      "problem_type": "chronic" | "acute" | null,
      "product": string,
      "product_detail": string | null,
      "dosage": string,
      "dosage_detail": string | null
    }
  ]
}

Rules:
1. clinical_recommendation: one short paragraph summarising the doctor's overall advice (lifestyle, diet, monitoring, follow-up timing). Empty string if not mentioned.
2. Each distinct medicine/product = one item. Never merge two medicines into one item.
3. problem: the skin/hair condition in English (e.g. "Androgenic Alopecia", "Post-inflammatory Hyperpigmentation", "Acne Vulgaris"). null if not stated.
4. problem_type: "chronic" for long-standing conditions (pattern hair loss, melasma, PIH), "acute" for recent/short-term, null if unclear.
5. product: the full medicine or product name in English. Translate Hindi names literally:
   - मिनॉक्सिडेल / minaxidil → "Minoxidil"
   - बायोटीन → "Biotin"
   - सनस्क्रीन → "Sunscreen"
   Keep brand names and strengths if mentioned (e.g. "Tretinoin 0.025% Cream").
6. product_detail: strength, form, or pack size (e.g. "5% solution · 60 ml", "0.025% · 15g tube", "30 tablets"). null if not stated.
7. dosage: clear instruction in English (e.g. "Apply 1 ml to scalp twice daily", "1 tablet at bedtime").
8. dosage_detail: additional timing/technique notes (e.g. "Leave on, do not rinse", "Take with food"). null if none.

Common abbreviations: BD/BID = twice daily, OD/QD = once daily, HS = at bedtime, TDS/TID = three times daily, SOS = as needed.
Common Kaya products: Minoxidil 5%, Biotin, Tretinoin, Hydroquinone, SPF 50 Sunscreen, Niacinamide Serum, Vitamin C Serum, Azelaic Acid, PRP therapy, GFC therapy, Laser Toning sessions, Hydrafacial.

EXAMPLE INPUT:
"Patient has androgenic alopecia. Tab Biotin 5000 mcg — ek tablet daily at night with food. Minoxidil 5% solution apply karo scalp pe 1 ml twice daily, don't wash for 4 hours. Anti-hair-fall serum 10 drops morning only. Follow up in 6 weeks."

EXAMPLE OUTPUT:
{
  "clinical_recommendation": "Patient presents with androgenic alopecia. Advised consistent daily application of Minoxidil and Biotin supplementation. Do not wash Minoxidil off for at least 4 hours post-application. Follow up in 6 weeks to assess early response.",
  "items": [
    { "problem": "Androgenic Alopecia", "problem_type": "chronic", "product": "Biotin 5000 mcg", "product_detail": "30 tablets", "dosage": "1 tablet daily at bedtime", "dosage_detail": "Take with food" },
    { "problem": "Androgenic Alopecia", "problem_type": "chronic", "product": "Minoxidil 5% Solution", "product_detail": "60 ml", "dosage": "Apply 1 ml to scalp twice daily", "dosage_detail": "Do not rinse for at least 4 hours" },
    { "problem": "Hair thinning", "problem_type": "chronic", "product": "Anti-Hair-Fall Serum", "product_detail": null, "dosage": "10 drops to scalp", "dosage_detail": "Morning only, no rinse required" }
  ]
}`;

function toRow(it: any): RxRow {
  return {
    problem: it.problem ? String(it.problem).trim() : null,
    problem_type:
      it.problem_type === "chronic" || it.problem_type === "acute" ? it.problem_type : null,
    product: String(it.product ?? it.name ?? "").trim(),
    product_detail: it.product_detail ? String(it.product_detail).trim() : null,
    dosage: String(it.dosage ?? it.instructions ?? "").trim(),
    dosage_detail: it.dosage_detail ? String(it.dosage_detail).trim() : null,
    cost: null,
  };
}

async function callClaude(voiceText: string): Promise<Record<string, any>> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) return {};

  // Try Anthropic directly first; fall through to OpenRouter if not configured
  const useAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);

  if (useAnthropic) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        temperature: 0,
        system: SYSTEM,
        messages: [{ role: "user", content: `Parse this prescription dictation:\n\n"${voiceText}"` }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text ?? "{}";
    try { return JSON.parse(text); } catch { return {}; }
  }

  // OpenRouter fallback — use Claude claude-sonnet-4-6 for best accuracy
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-4-5",
      max_tokens: 1200,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Parse this prescription dictation:\n\n"${voiceText}"` },
      ],
    }),
  });
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(text); } catch { return {}; }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const voiceText: string = body.voice_text ?? "";
  if (!voiceText.trim()) return NextResponse.json({ items: [], clinical_recommendation: "" });

  let result: Record<string, any> = {};
  try {
    result = await callClaude(voiceText);
  } catch (err) {
    console.error("Prescription parse error:", err);
  }

  let items: RxRow[] = [];
  if (Array.isArray(result.items) && result.items.length > 0) {
    items = result.items.map(toRow).filter((it: RxRow) => it.product);
  }

  // Fallback for offline/mock mode — split by line/semicolon
  if (!items.length && voiceText.trim()) {
    items = voiceText
      .split(/\n|;/)
      .map((line) => {
        const parts = line.split(",").map((s) => s.trim());
        return toRow({ product: parts[0] ?? line.trim(), dosage: parts[1] ?? "" });
      })
      .filter((it) => it.product);
  }

  // Auto-fill cost from catalog
  items = items.map((it) => ({ ...it, cost: lookupCatalogPrice(it.product) }));

  const clinical_recommendation =
    typeof result.clinical_recommendation === "string"
      ? result.clinical_recommendation.trim()
      : "";

  return NextResponse.json({ items, clinical_recommendation });
}
