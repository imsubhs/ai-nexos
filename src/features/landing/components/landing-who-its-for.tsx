import * as React from "react";

const PERSONAS = [
  {
    title: "Creative & production teams",
    desc: "Keep task ownership, working assets and deliverables connected to the project.",
    tags: "Create • Produce • Deliver",
  },
  {
    title: "Operations & project leads",
    desc: "Coordinate clients, timelines and workforce assignments through the delivery path.",
    tags: "Coordinate • Review • Approve",
  },
  {
    title: "Executives & client stakeholders",
    desc: "Understand delivery status or review shared work from the workspace relevant to your role.",
    tags: "See status • Review work",
  },
] as const;

export function LandingWhoItsFor() {
  return (
    <section
      id="who-its-for"
      aria-label="Target Teams"
      className="bg-white py-14 text-[#06151E] md:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[1280px] px-6 md:px-10 lg:px-20">
        {/* Section Overline */}
        <p className="font-mono text-[11px] tracking-[0.15em] text-[#898A8C] uppercase md:text-[12px]">
          06 / Who It&apos;s For
        </p>

        {/* Section Heading */}
        <h2 className="mt-3 font-sans text-[32px] leading-[1.1] font-semibold tracking-[-0.02em] text-[#06151E] md:text-[40px] lg:text-[48px]">
          For the people who move creative
          <br className="hidden sm:inline" /> work forward.
        </h2>

        {/* Supporting Narrative */}
        <p className="mt-4 max-w-[720px] font-sans text-[16px] leading-[1.55] text-[#545A5B] md:text-[17px]">
          Different responsibilities. A connected operational context.
        </p>

        {/* 3 Personas List */}
        <div className="mt-12 divide-y divide-[#D6D6D6] border-t border-b border-[#D6D6D6] md:mt-16">
          {PERSONAS.map((persona) => (
            <div
              key={persona.title}
              className="grid grid-cols-1 items-center gap-4 py-7 md:py-8 lg:grid-cols-12 lg:gap-8"
            >
              <div className="lg:col-span-4">
                <h3 className="text-[20px] font-semibold text-[#06151E] md:text-[22px]">
                  {persona.title}
                </h3>
              </div>

              <div className="lg:col-span-5">
                <p className="text-[15px] leading-relaxed text-[#545A5B]">
                  {persona.desc}
                </p>
              </div>

              <div className="lg:col-span-3 lg:text-right">
                <span className="font-mono text-[12px] tracking-wider text-[#898A8C] uppercase">
                  {persona.tags}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
