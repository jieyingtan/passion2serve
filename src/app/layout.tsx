import type { Metadata } from "next";
import { cookies } from "next/headers";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Passion2Serve",
    template: "%s | Passion2Serve",
  },
  description: "Coordinate community events and help every participant keep growing.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value ?? "en";

  return (
    <html lang={lang}>
      <body>{children}</body>
    </html>
  );
}
