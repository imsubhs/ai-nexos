import * as React from "react";

export function LandingSecurity() {
  return (
    <section
      id="security"
      aria-label="Security and Trust"
      className="bg-[#D6D6D6] py-14 text-[#06151E] md:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[1280px] px-6 md:px-10 lg:px-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Left Column Narrative */}
          <div className="lg:col-span-6">
            <p className="font-mono text-[11px] tracking-[0.15em] text-[#545A5B] uppercase md:text-[12px]">
              05 / Security & Trust
            </p>

            <h2 className="mt-3 font-sans text-[32px] leading-[1.1] font-semibold tracking-[-0.02em] text-[#06151E] md:text-[40px] lg:text-[48px]">
              Shared work. Clear boundaries.
            </h2>

            <p className="mt-4 font-sans text-[15px] leading-relaxed text-[#545A5B] md:text-[16px]">
              Internal and client workspaces serve different roles. Role-based
              access defines who can work with the information in each
              workspace.
            </p>

            <p className="mt-4 font-sans text-[14px] leading-relaxed text-[#545A5B]">
              Keep internal production coordination separate from the
              client&apos;s review and approval experience.
            </p>
          </div>

          {/* Right Column Role-Based Card */}
          <div className="lg:col-span-6">
            <div className="rounded-xl border border-[#545A5B]/20 bg-white p-6 shadow-sm sm:p-8">
              <p className="font-mono text-[10px] tracking-wider text-[#898A8C] uppercase">
                Role-based workspace access
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Panel 1: Internal Workspace */}
                <div className="rounded-lg border border-[#D6D6D6] bg-white p-4">
                  <div
                    className="flex size-4 items-center justify-center rounded-xs border border-[#06151E] text-[10px] text-[#06151E]"
                    aria-hidden="true"
                  >
                    ✓
                  </div>
                  <h3 className="mt-3 text-[16px] font-semibold text-[#06151E]">
                    Internal workspace
                  </h3>
                  <p className="mt-1 text-[13px] font-medium text-[#545A5B]">
                    Team roles
                  </p>
                  <p className="mt-2 text-[12px] text-[#898A8C]">
                    Projects • Tasks • Working assets
                  </p>
                </div>

                {/* Panel 2: Client Workspace */}
                <div className="rounded-lg border border-[#D6D6D6] bg-white p-4">
                  <div
                    className="flex size-4 items-center justify-center rounded-xs border border-[#06151E] text-[10px] text-[#06151E]"
                    aria-hidden="true"
                  >
                    ✓
                  </div>
                  <h3 className="mt-3 text-[16px] font-semibold text-[#06151E]">
                    Client workspace
                  </h3>
                  <p className="mt-1 text-[13px] font-medium text-[#545A5B]">
                    Client roles
                  </p>
                  <p className="mt-2 text-[12px] text-[#898A8C]">
                    Shared deliverables • Review • Approval
                  </p>
                </div>
              </div>

              <p className="mt-6 border-t border-[#D6D6D6]/60 pt-3 font-mono text-[11px] tracking-wider text-[#898A8C] uppercase">
                Distinct workspace scopes / Connected delivery context
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
