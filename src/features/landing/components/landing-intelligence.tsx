import * as React from "react";

export function LandingIntelligence() {
  return (
    <section
      id="intelligence"
      aria-label="Executive Intelligence"
      className="bg-white py-14 text-[#06151E] md:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[1280px] px-6 md:px-10 lg:px-20">
        {/* Section Overline */}
        <p className="font-mono text-[11px] tracking-[0.15em] text-[#898A8C] uppercase md:text-[12px]">
          04 / Executive Intelligence
        </p>

        {/* Section Heading */}
        <h2 className="mt-3 font-sans text-[32px] leading-[1.1] font-semibold tracking-[-0.02em] text-[#06151E] md:text-[40px] lg:text-[48px]">
          See the work behind the status.
        </h2>

        {/* Supporting Narrative */}
        <p className="mt-4 max-w-[720px] font-sans text-[16px] leading-[1.55] text-[#545A5B] md:text-[17px]">
          A clear view of delivery status, pending reviews and workload helps
          leaders understand the operation without losing the project context.
        </p>

        <p className="mt-2 text-[14px] text-[#898A8C] md:text-[15px]">
          Follow the relationships from project to deliverable, from review to
          approval, and from task to owner.
        </p>

        {/* Delivery Overview Operational Visibility Panel */}
        <div className="mt-10 rounded-xl border border-[#D6D6D6] bg-white p-6 shadow-xs sm:p-8 md:mt-12 md:p-10">
          <p className="font-mono text-[10px] tracking-wider text-[#898A8C] uppercase">
            Operational visibility / Illustrative
          </p>
          <h3 className="mt-1 text-[22px] font-semibold text-[#06151E] md:text-[26px]">
            Delivery overview
          </h3>

          {/* Active Campaigns List */}
          <div className="mt-6 divide-y divide-[#D6D6D6]/60 border-t border-b border-[#D6D6D6]/60">
            {/* Project 1 */}
            <div className="flex flex-wrap items-center justify-between gap-2 py-4">
              <div>
                <h4 className="text-[16px] font-semibold text-[#06151E]">
                  Brand campaign
                </h4>
                <p className="text-[13px] text-[#898A8C]">
                  Campaign concept / Creative team
                </p>
              </div>
              <span className="inline-flex items-center rounded border border-[#D6D6D6] px-2.5 py-1 text-[11px] font-medium text-[#06151E]">
                In review
              </span>
            </div>

            {/* Project 2 */}
            <div className="flex flex-wrap items-center justify-between gap-2 py-4">
              <div>
                <h4 className="text-[16px] font-semibold text-[#06151E]">
                  Content series
                </h4>
                <p className="text-[13px] text-[#898A8C]">
                  Editorial assets / Production team
                </p>
              </div>
              <span className="inline-flex items-center rounded border border-[#D6D6D6] px-2.5 py-1 text-[11px] font-medium text-[#06151E]">
                In production
              </span>
            </div>

            {/* Project 3 */}
            <div className="flex flex-wrap items-center justify-between gap-2 py-4">
              <div>
                <h4 className="text-[16px] font-semibold text-[#06151E]">
                  Identity project
                </h4>
                <p className="text-[13px] text-[#898A8C]">
                  Brand guidelines / Design team
                </p>
              </div>
              <span className="inline-flex items-center rounded border border-[#D6D6D6] px-2.5 py-1 text-[11px] font-medium text-[#06151E]">
                Approved
              </span>
            </div>
          </div>

          {/* Pending Review Sub-block */}
          <div className="mt-6 border-b border-[#D6D6D6]/60 pb-5">
            <p className="font-mono text-[10px] tracking-wider text-[#898A8C] uppercase">
              Pending review
            </p>
            <p className="mt-1.5 text-[14px] font-medium text-[#06151E]">
              Campaign concept → Client reviewer → Awaiting feedback
            </p>
          </div>

          {/* Workload Sub-block */}
          <div className="mt-5 space-y-1">
            <p className="font-mono text-[10px] tracking-wider text-[#898A8C] uppercase">
              Workload / Assigned work
            </p>
            <div className="mt-1.5 space-y-1 text-[13px] text-[#545A5B]">
              <p>Creative team / Concept development</p>
              <p>Production team / Deliverable preparation</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
