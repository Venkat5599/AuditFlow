"use client";

import { ArrowRight, Mail } from "lucide-react";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/Logo";

const footerLinks = {
  menu: [
    { label: "Arsenal", href: "#arsenal" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Run audit", href: "/dashboard" },
  ],
  company: [
    { label: "Agent Chat", href: "/chat" },
    { label: "GitHub", href: "https://github.com/Venkat5599/Garu" },
    { label: "Mantle", href: "https://mantle.xyz" },
  ],
  social: [
    { label: "Track 05 · AI DevTools", href: "#" },
    { label: "Turing Test 2026", href: "#" },
  ],
};

export function Footer(): ReactNode {
  return (
    <footer className="relative pt-38 mt-24 mx-2.5 max-[850px]:mx-0">
      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-full max-w-5xl">
        <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl/15">
          <div
            className="absolute inset-0 bg-center bg-no-repeat brightness-150"
            style={{ backgroundImage: 'url(/BG.jpg)', backgroundSize: 'cover' }}
            aria-hidden="true"
          />
          
          <div className="relative z-10 flex flex-col items-center text-center px-12 py-24 max-[850px]:px-6 max-[850px]:py-6 max-[850px]:pt-12">
            <h2 className="text-6xl max-[850px]:text-3xl text-black font-medium tracking-tight max-w-2xl mb-14 max-[850px]:mb-8">
              Audit your Solidity repo today
            </h2>

            <a
              href="/dashboard"
              className="flex items-center justify-center gap-2 px-7 py-3.5 bg-foreground hover:bg-foreground/90 text-background rounded-xl text-sm font-medium transition-colors"
            >
              Run an audit
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      <div className="bg-accent rounded-tr-[3rem] rounded-tl-[3rem] pt-96 pb-16 max-[850px]:pt-72">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-start justify-between gap-12 max-[850px]:flex-col max-[850px]:gap-10">
            <a href="/" className="flex items-center gap-2 text-neutral-900" aria-label="AuditFlow home">
              <LogoMark className="w-8 h-8" title="AuditFlow" />
              <span className="text-xl font-semibold text-neutral-900 leading-0">AuditFlow</span>
            </a>

            <nav className="flex gap-16 max-[850px]:gap-10 max-[850px]:flex-wrap" aria-label="Footer navigation">
              <div>
                <h3 className="text-xs font-medium text-neutral-900/50 uppercase tracking-wider mb-4">Menu</h3>
                <ul className="space-y-2">
                  {footerLinks.menu.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-sm text-neutral-900 hover:text-neutral-900/70 transition-colors">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-medium text-neutral-900/50 uppercase tracking-wider mb-4">Company</h3>
                <ul className="space-y-2">
                  {footerLinks.company.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-sm text-neutral-900 hover:text-neutral-900/70 transition-colors">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-medium text-neutral-900/50 uppercase tracking-wider mb-4">Social</h3>
                <ul className="space-y-2">
                  {footerLinks.social.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-sm text-neutral-900 hover:text-neutral-900/70 transition-colors">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </div>

          <div className="mt-16 pt-6">
            <p className="text-sm text-neutral-900/50 text-center">
              © {new Date().getFullYear()} AuditFlow · Mantle Turing Test Hackathon. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
