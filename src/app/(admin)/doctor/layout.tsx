import { PatientSearch } from "@/components/patient-search";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <PatientSearch />
      </div>
      {children}
    </div>
  );
}
