import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function LandingCta() {
  return (
    <section
      id="get-started"
      aria-label="Get Started"
      className="border-t border-[#545A5B]/30 bg-[#06151E] py-16 text-white md:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-[1280px] px-6 text-center md:px-10 lg:px-20">
        {/* Overline */}
        <p className="font-mono text-[11px] tracking-[0.2em] text-[#898A8C] uppercase md:text-[12px]">
          AI NEX OS / Creative Operations OS
        </p>

        {/* Heading */}
        <h2 className="mt-4 font-sans text-[34px] leading-[1.1] font-semibold tracking-[-0.02em] text-white sm:text-[42px] md:text-[48px]">
          Bring your creative operation
          <br className="hidden sm:inline" /> into one place.
        </h2>

        {/* Subtitle */}
        <p className="mx-auto mt-4 max-w-[620px] font-sans text-[16px] leading-relaxed text-[#898A8C] md:text-[17px]">
          Connect the client, the team and the delivery path in AI NEX OS.
        </p>

        {/* Action CTAs */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/login"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#D6D6D6] px-8 text-[15px] font-semibold text-[#06151E] shadow-sm transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-[#D6D6D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06151E] focus-visible:outline-none active:bg-[#D6D6D6] sm:w-auto"
          >
            <span>Get Started</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-[#545A5B] bg-transparent px-8 text-[15px] font-medium text-white transition-colors hover:border-[#898A8C] hover:bg-[#545A5B]/20 focus-visible:ring-2 focus-visible:ring-[#898A8C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06151E] focus-visible:outline-none sm:w-auto"
          >
            Log In
          </Link>
        </div>
      </div>
    </section>
  );
}
