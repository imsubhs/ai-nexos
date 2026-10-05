import * as React from "react";
import { ArrowRight, ArrowDown } from "lucide-react";

export function LandingClientPortal() {
  return (
    <section
      id="client-portal"
      aria-label="Client Portal"
      className="bg-[#06151E] py-14 text-white md:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[1280px] px-6 md:px-10 lg:px-20">
        {/* Section Overline */}
        <p className="font-mono text-[11px] tracking-[0.15em] text-[#898A8C] uppercase md:text-[12px]">
          03 / Client Portal
        </p>

        {/* Section Heading */}
        <h2 className="mt-3 font-sans text-[32px] leading-[1.1] font-semibold tracking-[-0.02em] text-white md:text-[40px] lg:text-[48px]">
          Bring clients into the delivery story.
          <br className="hidden sm:inline" /> Not the internal workspace.
        </h2>

        {/* Supporting Narrative */}
        <p className="mt-4 max-w-[720px] font-sans text-[16px] leading-[1.55] text-[#898A8C] md:text-[17px]">
          Give clients a focused place for shared deliverables, feedback and
          approvals, while the team manages production in its internal
          workspace.
        </p>

        {/* Dual Comparison Workspace Cards */}
        <div className="mt-12 flex flex-col items-center justify-between gap-6 md:mt-16 md:flex-row md:gap-4">
          {/* Internal Workspace Card */}
          <div className="w-full flex-1 rounded-xl bg-white p-6 text-[#06151E] shadow-xl sm:p-7 md:p-8">
            <p className="font-mono text-[10px] tracking-wider text-[#898A8C] uppercase">
              Internal workspace
            </p>
            <h3 className="mt-1.5 text-[20px] font-semibold text-[#06151E]">
              A connected place to produce.
            </h3>

            <div className="mt-5 border-t border-[#D6D6D6]/60 pt-4">
              <p className="font-mono text-[10px] tracking-wider text-[#898A8C] uppercase">
                Brand campaign / Campaign concept
              </p>

              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex size-9 items-center justify-center rounded border border-[#D6D6D6] bg-[#06151E]/5 text-[#545A5B]"
                  aria-hidden="true"
                >
                  <span className="font-mono text-xs">□</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-[15px] font-semibold text-[#06151E]">
                    Campaign concept
                  </h4>
                  <span className="mt-1 inline-flex items-center rounded bg-[#D6D6D6]/40 px-2 py-0.5 text-[11px] font-medium text-[#06151E]">
                    Shared for review
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-1 text-[13px] text-[#545A5B]">
                <p>Task owner: Creative team</p>
                <p>Working materials: Concept assets</p>
              </div>
            </div>

            <p className="mt-6 border-t border-[#D6D6D6]/60 pt-3 font-mono text-[11px] tracking-wider text-[#545A5B] uppercase">
              Client context • Project • Deliverable
            </p>
          </div>

          {/* Central Transition Indicator */}
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#545A5B] bg-[#06151E] text-white">
            <ArrowRight className="hidden size-4 md:block" aria-hidden="true" />
            <ArrowDown className="block size-4 md:hidden" aria-hidden="true" />
          </div>

          {/* Client Portal Card */}
          <div className="w-full flex-1 rounded-xl bg-white p-6 text-[#06151E] shadow-xl sm:p-7 md:p-8">
            <p className="font-mono text-[10px] tracking-wider text-[#898A8C] uppercase">
              Client portal
            </p>
            <h3 className="mt-1.5 text-[20px] font-semibold text-[#06151E]">
              A focused place to review.
            </h3>

            <div className="mt-5 border-t border-[#D6D6D6]/60 pt-4">
              <p className="font-mono text-[10px] tracking-wider text-[#898A8C] uppercase">
                Brand campaign / Campaign concept
              </p>

              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex size-9 items-center justify-center rounded border border-[#D6D6D6] bg-[#06151E]/5 text-[#545A5B]"
                  aria-hidden="true"
                >
                  <span className="font-mono text-xs">□</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-[15px] font-semibold text-[#06151E]">
                    Campaign concept
                  </h4>
                  <span className="mt-1 inline-flex items-center rounded border border-[#D6D6D6] px-2 py-0.5 text-[11px] font-medium text-[#06151E]">
                    In review
                  </span>
                </div>
              </div>

              {/* Client Review Comment Bubble */}
              <div className="mt-5 rounded-md border border-[#D6D6D6]/80 bg-[#06151E]/[0.03] p-3 text-[13px] text-[#06151E] italic">
                “Please refine the opening direction before approval.”
              </div>
            </div>

            <p className="mt-6 border-t border-[#D6D6D6]/60 pt-3 font-mono text-[11px] tracking-wider text-[#545A5B] uppercase">
              Feedback • Review • Approval
            </p>
          </div>
        </div>

        {/* Section Caption */}
        <p className="mt-8 text-center font-mono text-[11px] tracking-wider text-[#898A8C] uppercase md:text-[12px]">
          Illustrative collaboration / The same deliverable, with distinct
          workspace boundaries.
        </p>
      </div>
    </section>
  );
}
