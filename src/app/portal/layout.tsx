import type { Metadata } from "next";
import "./portal.css";

export const metadata: Metadata = {
  title: "Portal Wali Murid | MTs Almaarif 01 Singosari",
  description: "Sistem Informasi Digital MTs Almaarif 01 Singosari",
};

export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="portal-layout">
      {children}
    </div>
  );
}
