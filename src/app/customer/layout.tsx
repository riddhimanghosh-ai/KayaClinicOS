import type { Metadata } from "next";
import "./customer.css";
import { Sidebar, MobileTopbar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "Kaya — Your Skin & Hair Care",
  description: "Track your treatments, prescriptions, and progress with Kaya's customer portal.",
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <MobileTopbar />
        {children}
      </div>
    </div>
  );
}
