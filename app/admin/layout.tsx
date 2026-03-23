import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — APA Dashboard",
  description: "Admin panel for Alkimos Pipeline Alliance",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
