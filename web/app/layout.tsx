import "./globals.css";

export const metadata = { title: "AuditFlow — agent-orchestrated Solidity audits", description: "Connect GitHub, audit any Solidity repo, ship validated fixes as a PR. Built on Mantle." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
