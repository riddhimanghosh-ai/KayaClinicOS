import { inr } from "@/lib/utils";
import type { RxRow } from "@/lib/types";

// Static reference content from the shared Kaya prescription design.
// Used as the default until real dynamic prescription content is wired in.
export const SAMPLE_RX = {
  physician: "Dr. Preeti Sharma, MBBS, DVD",
  specialty: "Dermatology & Trichology",
  dispensing_fee_inr: 60,
  clinical_recommendation:
    "Patient presents with androgenic (pattern) alopecia associated with a dry, flaky scalp. Initiating PRP/GFC therapy — 3 sessions spaced 20–25 days apart, followed by monthly maintenance as needed. Daily topical Minoxidil at 5% concentration is essential; consistency is critical for results. Supplement with oral Biotin and the prescribed anti-hair-fall serum. Use a gentle sulfate-free shampoo and moisturising cleanser for the scalp; apply SPF 30+ on exposed skin daily. Lifestyle: increase water intake, eat a balanced protein-rich diet with fruits, and avoid excessive sun exposure. Follow-up in 6–8 weeks to assess GFC/PRP response and adjust the regimen.",
  items: [
    { problem: "हेयर लॉस", problem_type: "chronic" as const, product: "मिनॉक्सिडेल (Minoxidil 5%)", product_detail: "Topical solution · 60 ml", dosage: "Apply 1 ml twice daily to affected scalp", dosage_detail: "Morning & evening · leave-on, do not rinse", cost: null },
    { problem: "हेयर लॉस", problem_type: "chronic" as const, product: "GFC Therapy (Growth Factor Concentrate)", product_detail: "In-clinic procedure", dosage: "1 session every 20–25 days · 3 sessions", dosage_detail: "Then monthly maintenance as needed", cost: null },
    { problem: "हेयर लॉस", problem_type: null, product: "Anti Hair-Fall Serum", product_detail: "50 ml", dosage: "Apply 3–4 drops to scalp nightly", dosage_detail: "Massage gently · leave-on overnight", cost: null },
    { problem: "Skin Renewal", problem_type: null, product: "Peeling Session", product_detail: "In-clinic chemical peel", dosage: "1 session every 3–4 weeks", dosage_detail: "Follow post-peel care instructions", cost: null },
    { problem: "Skin Glow", problem_type: null, product: "Gluta Glow Face Serum", product_detail: "30 ml", dosage: "2–3 drops, apply to cleansed face AM & PM", dosage_detail: "Before moisturiser", cost: null },
    { problem: "Hyperpigmentation", problem_type: "chronic" as const, product: "Hyperpigmentation Reducing Face Serum", product_detail: "30 ml", dosage: "Apply to affected areas morning & evening", dosage_detail: "After cleansing · before SPF in the morning", cost: null },
    { problem: "Skin Glow & Hydration", problem_type: null, product: "Kaya NUTRA+ Glutathione Mouth Melt Powder", product_detail: "1 sachet per dose", dosage: "1 sachet daily · dissolve under tongue", dosage_detail: "Best taken on an empty stomach", cost: null },
    { problem: "Skin Brightening", problem_type: null, product: "Kaya Brightening Night Cream", product_detail: "50 ml", dosage: "Apply to face every night as the last step", dosage_detail: "After serum · avoid eye area", cost: null },
  ] as RxRow[],
};

export type PrescriptionDocProps = {
  patient: {
    name: string;
    dob?: string | null;
    guest_code?: string | null;
    id?: number;
    gender?: string | null;
  };
  doctorName?: string | null;
  doctorSpecialty?: string | null;
  clinicalRecommendation?: string | null;
  items: RxRow[];
  dispensingFeeInr?: number | null;
  createdAt?: string | null;
  weightText?: string | null;
  clinic?: {
    addressLine?: string;
    reg?: string;
  };
};

function ageFromDob(dob?: string | null): string | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const yrs = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return yrs > 0 && yrs < 130 ? `${yrs} yrs` : null;
}

function shortGender(g?: string | null): string | null {
  if (!g) return null;
  const s = g.toLowerCase();
  if (s.startsWith("f")) return "F";
  if (s.startsWith("m")) return "M";
  return g;
}

export function PrescriptionDocument({
  patient,
  doctorName,
  doctorSpecialty,
  clinicalRecommendation,
  items,
  dispensingFeeInr,
  createdAt,
  weightText,
  clinic,
}: PrescriptionDocProps) {
  // Until real dynamic content is supplied, fall back to the shared sample
  // design. Only the patient identity (name/age/sex) is dynamic.
  const hasItems = Array.isArray(items) && items.length > 0;
  const effItems = hasItems ? items : SAMPLE_RX.items;
  const effRec = clinicalRecommendation ?? (hasItems ? null : SAMPLE_RX.clinical_recommendation);
  const effDoctor = doctorName ?? SAMPLE_RX.physician;
  const effSpecialty = doctorSpecialty ?? (doctorName ? null : SAMPLE_RX.specialty);
  const effDispensing = dispensingFeeInr ?? SAMPLE_RX.dispensing_fee_inr;

  const subtotal = effItems.reduce((sum, it) => sum + (Number(it.cost) || 0), 0);
  const dispensing = Number(effDispensing) || 0;
  const total = subtotal + dispensing;
  const age = ageFromDob(patient.dob);
  const gender = shortGender(patient.gender);
  const ageLine = [age, gender, weightText].filter(Boolean).join(" · ");
  const dateIssued = (createdAt ?? new Date().toISOString()).slice(0, 10);
  const patientIdLabel = patient.guest_code
    ? patient.guest_code
    : patient.id
    ? `#PT-${String(patient.id).padStart(5, "0")}`
    : null;

  return (
    <div className="rx-doc bg-white text-[#1f2937] border border-[#e5e7eb] rounded-lg overflow-hidden">
      <div className="h-1.5 w-full bg-[#1f7a5a]" />
      <div className="p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div>
          <div className="text-3xl font-bold tracking-tight lowercase">kaya</div>
          <div className="mt-1 text-[10px] font-semibold tracking-[0.2em] text-[#6b7280]">
            SKIN · HAIR · BODY
          </div>
          <div className="mt-2 text-xs text-[#6b7280]">
            {clinic?.addressLine ?? "128 Willow Street · (415) 555-0192"} · Reg.{" "}
            {clinic?.reg ?? "KC-204189"}
          </div>
        </div>

        {/* Patient band */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-y border-[#e5e7eb] py-4">
          <Field label="Patient">
            <div className="font-semibold">{patient.name}</div>
            <div className="text-xs text-[#6b7280]">
              {[patient.dob ? `DOB ${patient.dob}` : null, patientIdLabel]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </Field>
          <Field label="Prescribing Physician">
            <div className="font-semibold">{effDoctor}</div>
            {effSpecialty && (
              <div className="text-xs text-[#6b7280]">{effSpecialty}</div>
            )}
          </Field>
          <Field label="Age">
            <div className="font-semibold">{ageLine || "—"}</div>
          </Field>
          <Field label="Date Issued">
            <div className="font-semibold">{dateIssued}</div>
            <div className="text-xs text-[#6b7280]">Valid 30 days</div>
          </Field>
        </div>

        {/* Clinical recommendation */}
        {effRec && (
          <div>
            <SectionLabel>Clinical Recommendation</SectionLabel>
            <p className="mt-2 text-sm leading-relaxed text-[#374151]">
              {effRec}
            </p>
          </div>
        )}

        {/* Treatment plan */}
        <div>
          <SectionLabel>Treatment Plan</SectionLabel>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-left text-[10px] font-semibold uppercase tracking-wide text-[#9ca3af]">
                <th className="py-2 pr-3 font-semibold">Problem</th>
                <th className="py-2 pr-3 font-semibold">Product / Medicine</th>
                <th className="py-2 pr-3 font-semibold">Dosage</th>
                <th className="py-2 text-right font-semibold">Cost</th>
              </tr>
            </thead>
            <tbody>
              {effItems.map((it, i) => (
                <tr key={i} className="border-b border-[#f3f4f6] align-top">
                  <td className="py-3 pr-3">
                    <div className="font-semibold leading-snug">{it.problem ?? "—"}</div>
                    {it.problem_type && (
                      <span className="mt-1 inline-block rounded bg-[#fdf2f8] px-1.5 py-0.5 text-[10px] font-medium capitalize text-[#9d174d]">
                        {it.problem_type}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="font-semibold leading-snug">{it.product}</div>
                    {it.product_detail && (
                      <div className="text-xs text-[#6b7280]">{it.product_detail}</div>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="leading-snug">{it.dosage}</div>
                    {it.dosage_detail && (
                      <div className="text-xs text-[#6b7280]">{it.dosage_detail}</div>
                    )}
                  </td>
                  <td className="py-3 text-right font-semibold whitespace-nowrap">
                    {it.cost === null || it.cost === undefined ? (
                      <span className="text-[#9ca3af]">—</span>
                    ) : (
                      inr(it.cost)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer: totals + signature */}
        <div className="flex flex-col gap-6 border-t border-[#e5e7eb] pt-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-[240px] space-y-1 text-sm">
            <div className="flex justify-between text-[#6b7280]">
              <span>Subtotal</span>
              <span>{inr(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#6b7280]">
              <span>Dispensing fee</span>
              <span>{inr(dispensing)}</span>
            </div>
            <div className="flex justify-between border-t border-[#e5e7eb] pt-1 text-base font-bold">
              <span>Estimated total</span>
              <span>{inr(total)}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-[cursive] text-2xl text-[#374151]">
              {effDoctor.replace(/^Dr\.?\s*/i, "").replace(/,.*$/, "")}
            </div>
            <div className="mt-1 border-t border-[#9ca3af] pt-1 text-[10px] uppercase tracking-wide text-[#9ca3af]">
              Physician Signature
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#9ca3af]">
        {label}
      </div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#1f7a5a]">
      {children}
    </div>
  );
}
