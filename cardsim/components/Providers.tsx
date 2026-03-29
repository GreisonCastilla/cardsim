"use client";

import { LanguageProvider } from "./LanguageContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

export function Providers({ children }: { children: React.ReactNode }) {
  // Try to use env var for Client ID, fallback to placeholder
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <LanguageProvider>{children}</LanguageProvider>
    </GoogleOAuthProvider>
  );
}
