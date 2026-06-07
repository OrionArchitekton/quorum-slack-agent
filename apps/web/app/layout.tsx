import type { ReactNode } from "react";

export const metadata = {
  title: "Quorum",
  description: "Decision memory for your workspace",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
