import "@/styles/globals.css";

import { type Metadata } from "next";

import { AppShell } from "@/app/_components/app-shell";
import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
  title: "ropejumping",
  description: "Платформа для роупджампинг-сообщества.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <TRPCReactProvider>
          <AppShell>{children}</AppShell>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
