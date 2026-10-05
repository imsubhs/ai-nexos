import * as React from "react";
import { LandingNav } from "./landing-nav";
import { LandingHero } from "./landing-hero";
import { LandingHowItWorks } from "./landing-how-it-works";
import { LandingCapabilities } from "./landing-capabilities";
import { LandingClientPortal } from "./landing-client-portal";
import { LandingIntelligence } from "./landing-intelligence";
import { LandingSecurity } from "./landing-security";
import { LandingWhoItsFor } from "./landing-who-its-for";
import { LandingBeforeAfter } from "./landing-before-after";
import { LandingCta } from "./landing-cta";
import { LandingFooter } from "./landing-footer";

export function LandingPageView() {
  return (
    <div className="min-h-screen bg-[#06151E] font-sans text-white antialiased selection:bg-[#D6D6D6] selection:text-[#06151E]">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-[#D6D6D6] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#06151E] focus:ring-2 focus:ring-white focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Global Navigation */}
      <LandingNav />

      {/* Main Content Landmark */}
      <main id="main-content" tabIndex={-1} className="outline-none">
        {/* 01. Hero & Product Visualization */}
        <LandingHero />

        {/* 02. How It Works (Workflow Stages 01-08) */}
        <LandingHowItWorks />

        {/* 03. Capabilities (3 Feature Stories) */}
        <LandingCapabilities />

        {/* 04. Client Portal (Internal vs Portal View) */}
        <LandingClientPortal />

        {/* 05. Executive Intelligence (3 Operational Panels) */}
        <LandingIntelligence />

        {/* 06. Security & Trust (Silver Section) */}
        <LandingSecurity />

        {/* 07. Who It's For (Target Personas) */}
        <LandingWhoItsFor />

        {/* 08. Before & After (Comparison Matrix) */}
        <LandingBeforeAfter />

        {/* 09. Final Conversion CTA */}
        <LandingCta />
      </main>

      {/* Global Footer */}
      <LandingFooter />
    </div>
  );
}
