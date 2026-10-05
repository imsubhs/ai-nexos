import * as React from "react";

export function LandingCapabilities() {
  return (
    <section
      id="capabilities"
      aria-label="Capabilities"
      className="border-t border-[#D6D6D6] bg-white py-14 text-[#06151E] md:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[1280px] px-6 md:px-10 lg:px-20">
        {/* Section Overline */}
        <p className="font-mono text-[11px] tracking-[0.15em] text-[#898A8C] uppercase md:text-[12px]">
          02 / Capabilities
        </p>

        {/* Section Heading */}
        <h2 className="mt-3 font-sans text-[32px] leading-[1.1] font-semibold tracking-[-0.02em] text-[#06151E] md:text-[40px] lg:text-[48px]">
          The context, the people and the
          <br className="hidden sm:inline" /> work. Connected.
        </h2>

        {/* Supporting Narrative */}
        <p className="mt-4 max-w-[720px] font-sans text-[16px] leading-[1.55] text-[#545A5B] md:text-[17px]">
          Manage the creative operation through the relationships that matter,
          from the client brief to the final deliverable.
        </p>

        {/* 3 Story Rows */}
        <div className="mt-12 flex flex-col gap-12 md:mt-16 md:gap-16">
          {/* Story 1: Organize */}
          <div className="grid grid-cols-1 items-center gap-8 border-t border-[#D6D6D6]/60 pt-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="font-mono text-[11px] tracking-wider text-[#898A8C] uppercase">
                Organize / Clients • Projects • Tasks
              </p>
              <h3 className="mt-2 text-[24px] font-semibold text-[#06151E] md:text-[28px]">
                Start with shared context.
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#545A5B]">
                Client and project management keep the brief close to the work.
                Tasks make ownership and the next step visible.
              </p>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-lg border border-[#D6D6D6] bg-white p-5 shadow-xs md:p-6">
                <p className="font-mono text-[10px] tracking-wider text-[#898A8C] uppercase">
                  Connected project record
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#D6D6D6]/60 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-medium text-[#545A5B]">
                      Client workspace
                    </span>
                    <span className="text-[#898A8C]" aria-hidden="true">
                      →
                    </span>
                    <span className="text-[16px] font-semibold text-[#06151E]">
                      Brand campaign
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[14px] text-[#545A5B]">
                    Develop concept / Creative team
                  </span>
                  <span className="inline-flex items-center rounded border border-[#D6D6D6] px-2.5 py-0.5 text-[11px] font-medium text-[#06151E]">
                    In progress
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Story 2: Coordinate */}
          <div className="grid grid-cols-1 items-center gap-8 border-t border-[#D6D6D6]/60 pt-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="font-mono text-[11px] tracking-wider text-[#898A8C] uppercase">
                Coordinate / Timelines • Calendar • Workforce
              </p>
              <h3 className="mt-2 text-[24px] font-semibold text-[#06151E] md:text-[28px]">
                Give the team a delivery path.
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#545A5B]">
                Timelines and calendar views connect milestones with task
                ownership. Workforce operations keep people and their
                assignments in view.
              </p>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-lg border border-[#D6D6D6] bg-white p-5 shadow-xs md:p-6">
                <p className="font-mono text-[10px] tracking-wider text-[#898A8C] uppercase">
                  Project timeline / Illustrative
                </p>

                {/* Milestone Progress Bar */}
                <div className="mt-5 space-y-2">
                  <div className="grid grid-cols-3 text-[12px] font-medium text-[#06151E]">
                    <span>Brief</span>
                    <span>Production</span>
                    <span className="text-[#898A8C]">Review</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-1.5 rounded-full bg-[#06151E]" />
                    <div className="h-1.5 rounded-full bg-[#06151E]" />
                    <div className="h-1.5 rounded-full bg-[#D6D6D6]" />
                  </div>
                </div>

                <div className="mt-6 space-y-1.5 border-t border-[#D6D6D6]/60 pt-4 text-[13px] text-[#545A5B]">
                  <p>Creative team → Concept development</p>
                  <p>Production team → Deliverable preparation</p>
                </div>
              </div>
            </div>
          </div>

          {/* Story 3: Deliver */}
          <div className="grid grid-cols-1 items-center gap-8 border-t border-[#D6D6D6]/60 pt-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="font-mono text-[11px] tracking-wider text-[#898A8C] uppercase">
                Deliver / Assets • Deliverables • Collaboration
              </p>
              <h3 className="mt-2 text-[24px] font-semibold text-[#06151E] md:text-[28px]">
                Keep the output in context.
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#545A5B]">
                Assets and deliverables stay connected to the project. Client
                collaboration brings review and approval into the same delivery
                story.
              </p>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-lg border border-[#D6D6D6] bg-white p-5 shadow-xs md:p-6">
                <p className="font-mono text-[10px] tracking-wider text-[#898A8C] uppercase">
                  Asset to deliverable
                </p>

                <div className="mt-4 flex items-center gap-3.5 border-b border-[#D6D6D6]/60 pb-4">
                  <div
                    className="flex size-10 items-center justify-center rounded border border-[#D6D6D6] bg-[#06151E]/5 text-[#545A5B]"
                    aria-hidden="true"
                  >
                    <span className="font-mono text-xs">□</span>
                  </div>
                  <div>
                    <h4 className="text-[15px] font-semibold text-[#06151E]">
                      Campaign concept
                    </h4>
                    <p className="text-[13px] text-[#898A8C]">
                      Brand campaign / Concept assets
                    </p>
                  </div>
                </div>

                <p className="mt-4 font-mono text-[11px] tracking-wider text-[#545A5B] uppercase">
                  Deliverable • Client review • Approval
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
