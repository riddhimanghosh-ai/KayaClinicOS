import { PatientSearch } from "@/components/patient-search";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      {/* Global patient search bar */}
      <div className="flex items-center justify-end">
        <PatientSearch />
      </div>
      {children}
    </div>
  );
}
