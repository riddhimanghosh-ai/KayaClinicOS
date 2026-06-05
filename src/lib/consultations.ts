import { db } from "./db";
import { maskTranscript, encrypt } from "./pii";
import { extractAttributes, extractAndSave } from "./tags";
import type { Consultation } from "./types";

export type ProcessedConsultation = {
  consultation: Consultation;
  masked: string;
  attributes: Record<string, string>;
};

// Mask + encrypt a raw transcript, persist the consultation, then extract
// cohort attributes and clinical tags off the masked text.
export async function processConsultation(
  patientId: number,
  appointmentId: number | null,
  doctorId: number | null,
  rawTranscript: string,
  durationSec: number | null = null
): Promise<ProcessedConsultation> {
  const { masked, pii } = await maskTranscript(rawTranscript);
  const transcriptEncrypted = encrypt(rawTranscript);
  const piiMapEncrypted = pii.length ? encrypt(JSON.stringify(pii)) : null;

  const d = db();
  const consultation = d
    .prepare(
      `INSERT INTO consultations
        (patient_id, appointment_id, doctor_id, transcript_masked, transcript_encrypted, pii_map_encrypted, duration_sec)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`
    )
    .get(
      patientId,
      appointmentId,
      doctorId,
      masked,
      transcriptEncrypted,
      piiMapEncrypted,
      durationSec
    ) as Consultation;

  // Extract flexible cohort data points from the masked transcript.
  const attributes = await extractAttributes(masked);
  upsertAttributes(patientId, consultation.id, attributes);

  // Keep the cohort engine fed: run the existing clinical-tag extractor too.
  try {
    await extractAndSave(patientId, null, masked);
  } catch {
    // tag extraction is best-effort
  }

  return { consultation, masked, attributes };
}

export function upsertAttributes(
  patientId: number,
  consultationId: number | null,
  attrs: Record<string, string>
): void {
  const d = db();
  const insert = d.prepare(
    `INSERT INTO patient_attributes (patient_id, consultation_id, key, value, source)
     VALUES (?, ?, ?, ?, 'consultation')`
  );
  const tx = d.transaction((entries: [string, string][]) => {
    for (const [key, value] of entries) {
      insert.run(patientId, consultationId, key, value);
    }
  });
  tx(Object.entries(attrs));
}
