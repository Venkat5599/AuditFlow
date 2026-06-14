"use client";

import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

const faqs = [
  {
    question: "What does AuditFlow actually do?",
    answer:
      "You connect GitHub and paste a Solidity repo. AuditFlow clones it, routes it through its audit arsenal + static analyzers + Mantle L2 detectors, produces a Code4rena-style report graded by severity (High/Medium/Low/QA/Gas), and can open a validated auto-fix pull request on the repo.",
  },
  {
    question: "Which tools does it run?",
    answer:
      "Static analyzers Slither and Aderyn for a deterministic baseline, plus a suite of LLM-driven security detectors covering reentrancy, access control, oracle/flashloan, accounting, and proxy patterns — and Mantle L2-specific checks. A signal-based router picks only the relevant tools per repo instead of running everything blindly.",
  },
  {
    question: "What is Mantle-specific about it?",
    answer:
      "AuditFlow ships 7 detectors for Mantle L2 semantics that generic auditors miss: MNT being the native gas token while ETH is an ERC-20, L1 data-fee gas accounting, blockhash being a weak RNG on L2, PUSH0/evmVersion deployment issues, and hardcoded addresses that don't exist on Mantle.",
  },
  {
    question: "How safe are the auto-fix PRs?",
    answer:
      "Every suggested fix must pass a validation gate — it has to apply cleanly (git apply) and compile (forge build / hardhat) on an isolated copy — before it enters the PR. Diffs that fail are reported but never committed, so an auto-PR never breaks the build.",
  },
  {
    question: "Does it keep my code on a server?",
    answer:
      "No. Repos are shallow-cloned to temp, audited, then deleted the instant the report is built. The PR step uses a separate fresh clone that's also deleted right after. Nothing is hoarded on disk and a sweeper clears anything left behind.",
  },
  {
    question: "What does it cost?",
    answer:
      "The audit engine runs on a free DeepSeek model via OpenCode Zen. Static analysis and Mantle detectors are deterministic and free. Built for the Mantle Turing Test 2026 hackathon, Track 05 (AI DevTools).",
  },
];

const ease = [0.23, 1, 0.32, 1] as const;

function FAQItem({
  faq,
  index,
  isOpen,
  onToggle,
}: {
  faq: (typeof faqs)[0];
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}): ReactNode {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease, delay: index * 0.05 }}
      onClick={onToggle}
      className="cursor-pointer rounded-2xl bg-frame p-5 shadow-sm sm:p-6"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      aria-expanded={isOpen}
    >
      <div className="flex w-full items-center justify-between gap-4 text-left">
        <span className="text-base font-medium text-foreground sm:text-lg">
          {faq.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease }}
          className="shrink-0"
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <p className="pt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQ(): ReactNode {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="w-full px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="mb-12 text-center sm:mb-16"
        >
          <span className="text-sm font-medium text-muted-foreground">
            Frequently Asked Questions
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Everything you need to know
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Can&apos;t find the answer you&apos;re looking for? Reach out!
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <motion.a
              href="/dashboard"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center rounded-xl bg-foreground px-6 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
            >
              Run an audit
            </motion.a>
            <motion.a
              href="/dashboard"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center rounded-xl border border-border bg-frame px-6 py-2.5 text-sm font-semibold text-foreground transition-colors"
            >
              Agent Chat
            </motion.a>
          </div>
        </motion.div>

        <div className="flex flex-col gap-3" role="list">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              faq={faq}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
