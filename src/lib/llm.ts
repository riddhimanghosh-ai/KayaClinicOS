import OpenAI from "openai";
import type { ExtractedTags } from "./types";

type Provider = "openrouter" | "groq";

type Config = {
  provider: Provider;
  baseURL: string;
  apiKey: string | undefined;
  model: string;
  live: boolean;
};

function config(): Config {
  const provider = (process.env.LLM_PROVIDER || "openrouter").toLowerCase() as Provider;
  if (provider === "groq") {
    const apiKey = process.env.GROQ_API_KEY;
    return {
      provider: "groq",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey,
      model: process.env.LLM_MODEL || "llama-3.3-70b-versatile",
      live: Boolean(apiKey),
    };
  }
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  return {
    provider: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    model: process.env.LLM_MODEL || "meta-llama/llama-3.3-70b-instruct",
    live: Boolean(apiKey),
  };
}

export function llmStatus() {
  const c = config();
  return {
    provider: c.provider,
    model: c.model,
    live: c.live,
    mode: c.live ? "live" : "mock",
  };
}

function client(c: Config): OpenAI {
  return new OpenAI({ apiKey: c.apiKey, baseURL: c.baseURL });
}

export async function chatJSON(system: string, user: string, maxTokens = 600): Promise<Record<string, any>> {
  const c = config();
  if (!c.live) return mockJSON(system, user);
  const resp = await client(c).chat.completions.create({
    model: c.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.2,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  });
  return safeParseJSON(resp.choices[0]?.message?.content ?? "{}");
}

export async function chatText(
  system: string,
  user: string,
  maxTokens = 400,
  temperature = 0.7
): Promise<string> {
  const c = config();
  if (!c.live) return mockText(system, user);
  const resp = await client(c).chat.completions.create({
    model: c.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature,
    max_tokens: maxTokens,
  });
  return (resp.choices[0]?.message?.content ?? "").trim();
}

function safeParseJSON(text: string): Record<string, any> {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {}
    }
  }
  return {};
}

// ---------------------------------------------------------------------------
// Deterministic mock — used when no API key is set so the prototype boots offline.
// ---------------------------------------------------------------------------

function mockJSON(system: string, user: string): Record<string, any> {
  if (/extract.*tag/i.test(system)) return mockExtractTags(user);
  if (/clinical bullet|key.*observation|bullet.*point/i.test(system)) return mockBullets(user);
  return {};
}

function mockBullets(note: string): { bullets: string[] } {
  const t = note.toLowerCase();
  const bullets: string[] = [];
  if (/(acne|breakout|comedone|pustule)/.test(t)) bullets.push("Active acne with comedonal involvement noted; topical protocol adjusted for clearance phase.");
  if (/(scar|boxcar|icepick|microneedling)/.test(t)) bullets.push("Post-inflammatory scarring assessed; patient confirmed as microneedling candidate after acne clearance.");
  if (/(barrier|sensitised|thin|stripped)/.test(t)) bullets.push("Compromised skin barrier identified; aggressive treatments deferred; gentle repair protocol initiated.");
  if (/(q-?switch|melasma|pigmentation|toning)/.test(t)) bullets.push("Persistent melasma assessed; patient cleared for Q-Switch Laser Toning with SPF counselling.");
  if (/(compliant|adherent|using.*product|regular)/.test(t)) bullets.push("Good product adherence confirmed; visible improvement in skin texture reported by patient.");
  if (/(prescription|topical|cream|serum)/.test(t)) bullets.push("Prescription updated; new topical formulation added to home regimen.");
  if (/(next|schedule|recommend|plan)/.test(t)) bullets.push("Next treatment session scheduled; doctor outlined progression plan for upcoming visits.");
  if (bullets.length === 0) {
    bullets.push("Doctor reviewed clinical progress and noted stable skin condition.");
    bullets.push("Treatment plan continues as previously outlined with no acute concerns.");
  }
  return { bullets: bullets.slice(0, 5) };
}

function mockExtractTags(text: string): ExtractedTags {
  const t = text.toLowerCase();

  let barrier: string = "intact";
  if (/(thin|compromised|weak|sensitised)/.test(t)) barrier = "thin";
  if (/(broken|stripped|inflamed barrier)/.test(t)) barrier = "compromised";

  let acne: string = "resolved";
  if (/(active acne|fresh breakout|comedones|pustules|whitehead)/.test(t)) acne = "active";
  else if (/(clearing|fading|resolving)/.test(t)) acne = "resolving";

  const scar = /(scar|boxcar|icepick|rolling|pitted)/.test(t) ? 1 : 0;

  let nextSvc: string | null = null;
  if (/(microneedling|rf microneedling|dermapen)/.test(t)) nextSvc = "Microneedling for Scars";
  else if (/(q-?switch|qs laser|pigmentation laser|toning)/.test(t)) nextSvc = "Q-Switch Laser Toning";
  else if (/subcision/.test(t)) nextSvc = "Subcision (per scar zone)";
  else if (/peel/.test(t)) nextSvc = "Chemical Peel - Glycolic";

  let ready: string | null = null;
  if (/ready for q-?switch|schedule qs/.test(t)) ready = "Q_Switch_Laser";
  else if (/ready for microneedling/.test(t)) ready = "Microneedling";

  let primary = "general_skin_health";
  if (/melasma/.test(t)) primary = "deep_dermal_melasma";
  else if (scar) primary = "post_inflammatory_acne_scarring";
  else if (acne === "active") primary = "active_inflammatory_acne";

  let adherence = 7;
  if (/(not using|stopped|non-?compliant|missed)/.test(t)) adherence = 3;
  else if (/(compliant|using daily|regular|diligent)/.test(t)) adherence = 9;

  return {
    primary_concern: primary,
    barrier_status: barrier,
    next_recommended_service: nextSvc,
    product_adherence_score: adherence,
    active_acne_status: acne,
    scar_treatment_candidate: scar,
    treatment_ready_for: ready,
    free_tags: {},
  };
}

function mockText(system: string, user: string): string {
  if (/whatsapp|promotional/i.test(system)) return mockWhatsApp(user);
  if (/dermatology scribe|summarise.*doctor|post-consultation/i.test(system)) {
    return mockNoteSummary(user);
  }
  if (/clinical.*narrative|summarise.*patient|senior dermatologist/i.test(system)) {
    return mockClinicalNarrative(user);
  }
  if (/doctor/i.test(system) && /(ask|follow)/i.test(system)) {
    return "Got it. Anything on barrier status or product adherence you'd like to add?";
  }
  return "Acknowledged.";
}

function mockNoteSummary(note: string): string {
  const t = note.toLowerCase();
  if (/(scar|boxcar|icepick|microneedling)/.test(t)) return "Doctor confirmed scar treatment candidacy and recommended microneedling after acne clearance.";
  if (/(melasma|pigmentation|q-switch|qs laser)/.test(t)) return "Doctor noted persistent melasma and flagged patient ready for Q-Switch Laser Toning.";
  if (/(acne|breakout|comedone|pustule)/.test(t)) return "Doctor observed active acne and adjusted treatment to focus on clearance protocol.";
  if (/(barrier|sensitised|thin skin)/.test(t)) return "Doctor flagged compromised barrier status and recommended gentle care before further treatment.";
  if (/(compliant|adhering|using products|regular)/.test(t)) return "Doctor noted strong product adherence and discussed progression to next treatment phase.";
  return "Doctor reviewed patient progress and updated clinical recommendations for next visit.";
}

function mockClinicalNarrative(prompt: string): string {
  const t = prompt.toLowerCase();
  if (/(scar|microneedling|boxcar)/.test(t)) return "Patient has completed acne clearance and is now a confirmed scar treatment candidate with intact barrier. Recommended trajectory is RF microneedling or subcision. Product adherence is good, supporting treatment readiness. Immediate next step: schedule microneedling consultation.";
  if (/(melasma|q-switch|pigmentation)/.test(t)) return "Patient presents with persistent deep dermal melasma, having tried brightening topicals. Doctor has flagged readiness for Q-Switch Laser Toning. Adherence to home regimen is consistent. Next step: schedule first Q-Switch session with SPF counselling.";
  if (/(acne|clearance|inflammatory)/.test(t)) return "Patient is undergoing active acne clearance with moderate response to treatment. Barrier is intact and adherence is satisfactory. Doctor is monitoring progression before recommending scar intervention. Continue current protocol for 1–2 more sessions.";
  return "Patient has an active treatment history with consistent clinic visits. Clinical tags indicate good treatment response and adequate product adherence. Doctor recommendations are current and no urgent concerns flagged. Continue scheduled sessions as planned.";
}

// ---------------------------------------------------------------------------
// Groq Whisper audio transcription
// ---------------------------------------------------------------------------

export async function transcribeAudio(audioBuffer: Buffer, mimeType = "audio/webm"): Promise<string> {
  const c = config();
  if (!c.live) return "[Transcription unavailable — GROQ_API_KEY not set]";
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
  formData.append("file", blob, "recording.webm");
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("response_format", "json");
  const resp = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${c.apiKey}` },
    body: formData,
  });
  if (!resp.ok) {
    let errBody = "";
    try { errBody = await resp.text(); } catch {}
    // Parse Groq error for a helpful message
    let reason = `HTTP ${resp.status}`;
    try {
      const parsed = JSON.parse(errBody);
      const code = parsed?.error?.code ?? "";
      const msg  = parsed?.error?.message ?? errBody;
      if (code === "organization_restricted") {
        reason = "Your Groq organisation has been restricted — please visit console.groq.com → Help to resolve it.";
      } else {
        reason = msg || reason;
      }
    } catch {}
    // Return a recoverable sentinel instead of throwing — the caller can show this
    // string in the transcript area and let the user type over it.
    return `[Transcription failed: ${reason}]`;
  }
  const data = await resp.json() as { text?: string };
  return (data.text ?? "").trim();
}

function mockWhatsApp(prompt: string): string {
  const m = prompt.match(/patient[:\s]+([A-Z][\w]+(?:\s[A-Z][\w]+)?)/i);
  const first = m ? m[1].split(/\s+/)[0] : "there";
  const lower = prompt.toLowerCase();
  if (lower.includes("missed") || lower.includes("missed session")) {
    return `Hi ${first}, we missed you at Kaya! We noticed you haven't been in for a while and you still have sessions remaining. To make it easy to get back on track, we'd love to have you in this weekend. Call 9820000000 to book your slot — just for you.`;
  }
  if (lower.includes("followup") || lower.includes("follow up") || lower.includes("recent treatment")) {
    return `Hi ${first}, just checking in after your recent treatment at Kaya! How is your skin feeling? We hope you're seeing great results. Do reply or call us if you have any questions — we're always here for you.`;
  }
  if (lower.includes("alpha") || (lower.includes("acne") && lower.includes("scar"))) {
    return `Hi ${first}, this is Kaya. Dr. Malhotra reviewed your file — your acne has cleared, and your skin is in the ideal window to start scar revision (microneedling). As a clinic offer, your first session is 20% off. Reply YES to book.`;
  }
  if (lower.includes("beta") || lower.includes("pigmentation") || lower.includes("melasma")) {
    return `Hi ${first}, your dermatologist has flagged you as ready for Q-Switch Laser Toning to address the deeper pigmentation. We're running a clinic offer — first 2 sessions at 15% off this month. Want us to book a slot?`;
  }
  if (lower.includes("gap") || lower.includes("drop") || lower.includes("missed")) {
    return `Hi ${first}, your laser package still has sessions waiting for you. To make it easier to resume, your next session is on the house at 20% off. Reply YES and we'll confirm a slot.`;
  }
  return `Hi ${first}, this is Kaya — your dermatologist would like to invite you in. Reply YES to book.`;
}
