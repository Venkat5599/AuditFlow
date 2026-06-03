import { BlurInHeadline } from "@/components/blur-in-headline";
import { FAQ } from "@/components/faq";
import { FeaturesBento } from "@/components/features-bento";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { Pricing } from "@/components/pricing";
import { Testimonials } from "@/components/testimonials";
import AuditApp from "@/components/AuditApp";
import type { ReactNode } from "react";

export default function HomePage(): ReactNode {
  return (
    <main id="main-content" className="flex-1">
      <Hero />
      <BlurInHeadline />
      <FeaturesBento />
      <Testimonials />

      {/* AuditFlow live panel */}
      <section id="audit" className="mx-auto max-w-4xl px-4 py-20">
        <h2 className="mb-2 text-center text-3xl font-semibold tracking-tight sm:text-4xl">Try it now</h2>
        <p className="mb-8 text-center text-muted-foreground">Paste a Solidity repo. Watch the orchestration run live.</p>
        <AuditApp />
      </section>

      <HowItWorks />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  );
}
