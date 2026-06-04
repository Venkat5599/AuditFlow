"use client";
import { ArrowDownRight } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/Logo";

const ease = [0.23, 1, 0.32, 1] as const;

export function SiteHeader(): ReactNode {
  return (
    <motion.header
      initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.5, ease }}
      className="fixed left-1/2 top-2.5 z-[9998] w-full max-w-5xl -translate-x-1/2 rounded-b-4xl bg-frame shadow-2xl/20 max-[850px]:top-0 max-[850px]:left-0 max-[850px]:right-0 max-[850px]:w-full max-[850px]:max-w-none max-[850px]:translate-x-0 max-[850px]:rounded-none"
    >
      <div className="flex h-20 items-center justify-between px-6 max-[850px]:h-18">
        <a href="/" className="flex items-center gap-2 text-accent">
          <LogoMark className="h-6 w-6" title="AuditFlow" />
          <span className="text-lg font-semibold leading-none text-foreground">AuditFlow</span>
        </a>
        <nav className="flex items-center gap-1 max-[850px]:hidden">
          <a href="/#arsenal" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground">Arsenal</a>
          <a href="/#how-it-works" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground">How it works</a>
          <a href="/dashboard" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground">Agent</a>
        </nav>
        <a href="/dashboard" className="group relative inline-flex items-center">
          <span className="absolute inset-y-0 right-0 w-[calc(100%-1.5rem)] rounded-xl bg-accent" />
          <span className="relative z-10 rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background">Run an audit</span>
          <span className="relative -left-px z-10 flex h-10 w-10 items-center justify-center rounded-xl text-black">
            <ArrowDownRight className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-45" />
          </span>
        </a>
      </div>
    </motion.header>
  );
}
