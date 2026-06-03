"use client";

import { LogoLoop, type LogoItem } from "@/components/logo-loop";
import { HeroMock } from "@/components/hero-mock";
import { ArrowDownRight } from "lucide-react";
import { motion } from "motion/react";
import { type ReactNode } from "react";

const ease = [0.23, 1, 0.32, 1] as const;

const fadeInUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const fadeInScale = {
  hidden: { opacity: 0, scale: 0.95, filter: "blur(8px)" },
  visible: { opacity: 1, scale: 1, filter: "blur(0px)" },
};

const TOOLS = ["Slither", "Aderyn", "pashov", "QuillAI", "nemesis", "Mantle", "Foundry", "Octokit", "DeepSeek", "Code4rena"];
const logos: LogoItem[] = TOOLS.map((name) => ({
  node: <span className="text-xl font-semibold tracking-tight text-black/70">{name}</span>,
}));

export function Hero(): ReactNode {
  return (
    <section className="flex flex-col relative" style={{ colorScheme: 'light' }}>
      {/* Static background — no per-mousemove parallax (kept scroll smooth). */}
      <div
        className="absolute inset-0 min-[850px]:inset-2.5 bg-cover bg-center bg-no-repeat -z-10 rounded-br-4xl rounded-bl-4xl"
        style={{ backgroundImage: 'url(/BG.jpg)' }}
        aria-hidden="true"
      />
      
      <div className="flex items-start justify-center px-6 pt-64 max-[850px]:pt-32">
        <motion.div
          className="flex flex-col items-center max-[850px]:items-start text-center max-[850px]:text-left max-w-4xl max-[850px]:w-full"
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.15, delayChildren: 0.2 }}
        >
          <motion.div
            className="inline-flex items-center gap-1.5 pl-4 pr-3 py-1.5 rounded-xl border border-black/10 bg-white text-black text-sm font-medium mb-6"
            variants={fadeInUp}
            transition={{ duration: 0.8, ease }}
          >
            Mantle · Turing Test 2026 · Track 05
            <span className="text-accent">✦</span>
          </motion.div>

          <h1 className="text-8xl max-[850px]:text-5xl font-medium tracking-tight leading-[1.1] mb-6 text-black">
            <motion.span
              className="block"
              variants={fadeInUp}
              transition={{ duration: 0.8, ease }}
            >
              Audit any Solidity repo.
            </motion.span>
            <motion.span
              className="block"
              variants={fadeInUp}
              transition={{ duration: 0.8, ease }}
            >
              Ship the <span className="rounded-2xl bg-accent px-3 not-italic text-black">fixes.</span>
            </motion.span>
          </h1>

          <motion.p
            className="text-lg text-neutral-600 mb-8 max-w-2xl"
            variants={fadeInUp}
            transition={{ duration: 0.8, ease }}
          >
            Connect GitHub, paste a repo. AuditFlow routes it through 31 audit skills + Mantle L2 detectors, writes a Code4rena-style report, and opens a validated auto-fix PR.
          </motion.p>

          <motion.a
            href="/dashboard"
            className="group relative cursor-pointer inline-flex items-center max-[850px]:w-full"
            variants={fadeInScale}
            transition={{ duration: 0.8, ease }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="absolute right-0 inset-y-0 w-[calc(100%-2rem)] max-[850px]:w-full rounded-xl bg-accent" />
            <span className="relative z-10 px-6 py-3 rounded-xl bg-black text-white font-medium max-[850px]:flex-1">Run an audit</span>
            <span className="relative -left-px z-10 w-11 h-11 rounded-xl flex items-center justify-center text-black">
              <ArrowDownRight className="w-5 h-5 transition-transform duration-300 group-hover:-rotate-45" />
            </span>
          </motion.a>
        </motion.div>
      </div>

      <motion.div
        className="relative px-6 mt-24 max-[850px]:mt-10"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.6, ease }}
      >
        <div className="relative max-w-5xl mx-auto">
          <HeroMock />
        </div>
      </motion.div>

      <motion.div
        className="pt-24 pb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1, ease }}
      >
        <LogoLoop logos={logos} speed={60} logoHeight={42} gap={124} />
      </motion.div>
    </section>
  );
}
