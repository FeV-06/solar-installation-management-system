import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solar Installation Management System",
  description: "A shared foundation for the solar installation management project.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
