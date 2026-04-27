import "@/styles/globals.css";

import { type Metadata } from "next";

import { SiteHeader } from "@/app/_components/site-header";
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
          <SiteHeader />
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  );
}
