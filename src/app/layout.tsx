import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { Toaster } from "sonner";
import { ConfirmDialogHost } from "@/components/shared/ConfirmDialog";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "ATFAR - Asociación Trabajadores de Farmacia Rosario",
  description: "Desde 1927 representando, defendiendo y acompañando a los trabajadores en la actividad farmacéutica de Rosario.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <ConfirmDialogHost />
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: "var(--font-inter)",
              fontSize: "0.85rem",
              fontWeight: 600,
              borderRadius: "0.75rem",
            },
          }}
        />
      </body>
    </html>
  );
}
