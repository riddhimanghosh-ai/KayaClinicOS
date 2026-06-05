import type { Metadata } from "next";
import "./customer.css";

export const metadata: Metadata = {
  title: "Kaya — Your Skin & Hair Care",
  description: "Track your treatments, prescriptions, and progress with Kaya's customer portal.",
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
