import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function LandingHero() {
  return (
    <section
      id="product"
      aria-label="AI NEX OS Overview"
      className="relative overflow-hidden bg-[#06151E] pt-14 pb-16 text-white md:pt-20 md:pb-24 lg:pt-24 lg:pb-28"
    >
      <div className="mx-auto max-w-[1280px] px-6 md:px-10 lg:px-20">
        {/* Category Overline */}
        <div className="text-center">
          <p className="font-mono text-[11px] tracking-[0.2em] text-[#898A8C] uppercase md:text-[12px]">
            The operating system for creative work
          </p>

          {/* Main Hero Headline */}
          <h1 className="mt-4 font-sans text-[44px] leading-[1.05] font-semibold tracking-[-0.03em] text-white md:text-[56px] lg:text-[76px]">
            Creative operations.
            <br />
            One connected workspace.
          </h1>

          {/* Subheading / Positioning Narrative */}
          <p className="mx-auto mt-6 max-w-[690px] font-sans text-[16px] leading-[1.55] text-[#898A8C] md:text-[19px]">
            AI NEX OS connects client context, projects, task ownership, assets,
            deliverables, review and approval with operational visibility.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/login"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#D6D6D6] px-7 text-[15px] font-semibold text-[#06151E] shadow-sm transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-[#D6D6D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06151E] focus-visible:outline-none active:bg-[#D6D6D6] sm:w-auto"
            >
              <span>Get Started</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-[#545A5B] bg-transparent px-7 text-[15px] font-medium text-white transition-colors hover:border-[#898A8C] hover:bg-[#545A5B]/20 focus-visible:ring-2 focus-visible:ring-[#898A8C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06151E] focus-visible:outline-none sm:w-auto"
            >
              Log In
            </Link>
          </div>
        </div>

        {/* Hero Product Visualization Panel (Illustrative Workspace) */}
        <div className="relative mx-auto mt-14 max-w-[1052px] md:mt-20">
          {/* Main Dark Workspace Window */}
          <div className="rounded-xl border border-[#545A5B] bg-[#06151E] p-5 shadow-2xl sm:p-7 md:p-9">
            {/* Top Workspace Header */}
            <div className="flex items-center justify-between border-b border-[#545A5B]/40 pb-4">
              <div className="flex items-center gap-2">
                <span
                  className="size-2 rounded-xs bg-[#898A8C]"
                  aria-hidden="true"
                />
                <span className="font-mono text-[11px] tracking-wider text-[#898A8C] uppercase">
                  Illustrative workspace
                </span>
              </div>
              <span className="font-mono text-[11px] tracking-wider text-[#898A8C] uppercase">
                Internal
              </span>
            </div>

            {/* Sub-navigation Tabs */}
            <div className="mt-4 flex flex-wrap items-center gap-4 border-b border-[#545A5B]/30 pb-4 text-[13px] text-[#898A8C] sm:gap-6">
              <span className="cursor-default transition-colors hover:text-white">
                Clients
              </span>
              <span className="border-b-2 border-white pb-0.5 font-semibold text-white">
                Projects
              </span>
              <span className="cursor-default transition-colors hover:text-white">
                Tasks
              </span>
              <span className="cursor-default transition-colors hover:text-white">
                Assets
              </span>
              <span className="cursor-default transition-colors hover:text-white">
                Deliverables
              </span>
              <span className="cursor-default transition-colors hover:text-white">
                Review
              </span>
              <span className="cursor-default transition-colors hover:text-white">
                Approval
              </span>
              <span className="cursor-default transition-colors hover:text-white">
                Intelligence
              </span>
            </div>

            {/* Status Triad Row */}
            <div className="mt-6 grid grid-cols-1 gap-4 border-b border-[#545A5B]/30 pb-6 sm:grid-cols-3">
              <div>
                <p className="font-mono text-[11px] tracking-wider text-[#898A8C] uppercase">
                  Delivery status
                </p>
                <p className="mt-1 text-[15px] font-medium text-white">
                  In production
                </p>
              </div>
              <div>
                <p className="font-mono text-[11px] tracking-wider text-[#898A8C] uppercase">
                  Review status
                </p>
                <p className="mt-1 text-[15px] font-medium text-white">
                  Awaiting client
                </p>
              </div>
              <div>
                <p className="font-mono text-[11px] tracking-wider text-[#898A8C] uppercase">
                  Task ownership
                </p>
                <p className="mt-1 text-[15px] font-medium text-white">
                  Assigned
                </p>
              </div>
            </div>

            {/* Active Project Record Card */}
            <div className="mt-6 rounded-lg border border-[#545A5B] bg-[#06151E] p-5 md:p-6">
              <p className="font-mono text-[10px] tracking-widest text-[#898A8C] uppercase">
                Client / Client workspace
              </p>
              <h2 className="mt-1 text-[22px] font-semibold text-white md:text-[26px]">
                Brand campaign
              </h2>

              <div className="mt-5 grid grid-cols-1 gap-4 border-t border-[#545A5B]/30 pt-4 sm:grid-cols-3">
                <div>
                  <p className="font-mono text-[10px] tracking-wider text-[#898A8C] uppercase">
                    Task
                  </p>
                  <p className="mt-0.5 text-[14px] text-white">
                    Develop concept
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-wider text-[#898A8C] uppercase">
                    Owner
                  </p>
                  <p className="mt-0.5 text-[14px] text-white">Creative team</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-wider text-[#898A8C] uppercase">
                    Next step
                  </p>
                  <p className="mt-0.5 text-[14px] text-white">Client review</p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 border-t border-[#545A5B]/20 pt-3">
                <span
                  className="size-3.5 rounded-xs border border-[#898A8C]"
                  aria-hidden="true"
                />
                <span className="font-mono text-[12px] text-[#D6D6D6]">
                  Concept assets → Campaign concept
                </span>
              </div>
            </div>

            {/* Panel Bottom Caption */}
            <p className="mt-5 font-mono text-[10px] tracking-wider text-[#898A8C] uppercase">
              Client context • Project • Delivery
            </p>
          </div>

          {/* Overlapping Floating Approval Card (Desktop/Tablet absolute, Mobile inline-stacked) */}
          <div className="mt-4 w-full rounded-xl border border-[#D6D6D6] bg-white p-5 text-[#06151E] shadow-2xl sm:absolute sm:right-6 sm:-bottom-8 sm:mt-0 sm:w-[300px] md:right-8 md:w-[320px]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-widest text-[#898A8C] uppercase">
                Review • Approval
              </span>
            </div>
            <h3 className="mt-1 text-[17px] font-semibold text-[#06151E]">
              Campaign concept
            </h3>
            <p className="mt-1 text-[13px] leading-snug text-[#545A5B]">
              Client feedback stays connected to the deliverable.
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-[#D6D6D6]/60 pt-3">
              <span className="inline-flex items-center rounded bg-[#D6D6D6]/50 px-2 py-0.5 text-[11px] font-medium text-[#06151E]">
                In review
              </span>
              <span className="text-[12px] text-[#898A8C]">
                Client reviewer
              </span>
            </div>
          </div>
        </div>

        {/* Below Hero Visualization Caption */}
        <p className="mt-16 text-center font-mono text-[11px] tracking-[0.2em] text-[#898A8C] uppercase md:mt-20 md:text-[12px]">
          Client context / Clear ownership / Connected delivery
        </p>
      </div>
    </section>
  );
}
