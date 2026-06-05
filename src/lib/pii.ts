import crypto from "node:crypto";
import { chatJSON } from "./llm";

// ---------------------------------------------------------------------------
// Symmetric encryption for the raw consultation transcript + PII map.
// AES-256-GCM. Ciphertext is base64( iv[12] | authTag[16] | data ).
// ---------------------------------------------------------------------------

let warned = false;

function getKey(): Buffer {
  const raw = process.env.PII_ENCRYPTION_KEY;
  if (raw) {
    const buf = Buffer.from(raw, "base64");
    if (buf.length === 32) return buf;
    // Allow a plain-text key by hashing it to 32 bytes.
    return crypto.createHash("sha256").update(raw).digest();
  }
  if (!warned) {
    console.warn(
      "[pii] PII_ENCRYPTION_KEY not set — using an insecure dev key. Set a 32-byte base64 key in production."
    );
    warned = true;
  }
  return crypto.createHash("sha256").update("kaya-dev-insecure-key").digest();
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(blob: string): string {
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

// ---------------------------------------------------------------------------
// PII masking. Names → [person], phones → [phone], etc. The raw transcript is
// preserved separately (encrypted), so masking does not need to be reversible.
// ---------------------------------------------------------------------------

export type PiiEntry = { type: string; value: string };
export type MaskResult = { masked: string; pii: PiiEntry[] };

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// Indian-style phone numbers: optional +91, 10+ digits possibly spaced/dashed.
const PHONE_RE = /(\+?\d[\d\s-]{8,}\d)/g;

function regexMask(text: string): MaskResult {
  const pii: PiiEntry[] = [];
  let out = text.replace(EMAIL_RE, (m) => {
    pii.push({ type: "email", value: m });
    return "[email]";
  });
  out = out.replace(PHONE_RE, (m) => {
    // Avoid masking short measurements like "68 kg" or years.
    const digits = m.replace(/\D/g, "");
    if (digits.length < 10) return m;
    pii.push({ type: "phone", value: m.trim() });
    return "[phone]";
  });
  return { masked: out, pii };
}

const PII_SYSTEM = `You are a PII redaction engine for a medical clinic (Kaya, India).
Replace every piece of personally identifying information in the transcript with a generic bracketed placeholder, keeping all clinical content intact.
Placeholders to use:
- Patient or person names -> [person]
- Phone numbers -> [phone]
- Email addresses -> [email]
- Home/street addresses -> [address]
- Date of birth or exact birth date -> [dob]
- Government IDs (Aadhaar, PAN, etc.) -> [id]
Do NOT mask clinical values such as age, weight, height, skin type, measurements, medicine names, or dates of visits.
Return ONLY JSON: { "masked_transcript": string, "pii": [{ "type": string, "value": string }] }`;

export async function maskTranscript(raw: string): Promise<MaskResult> {
  // Regex backstop first (works even with no LLM key).
  const base = regexMask(raw);

  let llmMasked = "";
  let llmPii: PiiEntry[] = [];
  try {
    const res = await chatJSON(PII_SYSTEM, base.masked, 2000);
    if (typeof res.masked_transcript === "string" && res.masked_transcript.trim()) {
      llmMasked = res.masked_transcript;
      if (Array.isArray(res.pii)) {
        llmPii = res.pii
          .filter((p: any) => p && p.value)
          .map((p: any) => ({ type: String(p.type ?? "pii"), value: String(p.value) }));
      }
    }
  } catch {
    // fall through to regex-only result
  }

  const masked = llmMasked || base.masked;
  const pii = [...base.pii, ...llmPii];
  return { masked, pii };
}
