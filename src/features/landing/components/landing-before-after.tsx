import * as React from "react";

const COMPARISONS = [
  {
    before: "Context scattered across handoffs",
    after: "Client context connected to the project",
  },
  {
    before: "Ownership hard to follow",
    after: "Tasks linked to owners and status",
  },
  {
    before: "Assets separated from the output",
    after: "Assets and deliverables kept in project context",
  },
  {
    before: "Feedback detached from delivery",
    after: "Review and approval connected to the deliverable",
  },
  {
    before: "Status assembled from separate updates",
    after: "Delivery, reviews and workload visible together",
  },
] as const;

export function LandingBeforeAfter() {
  return (
    <section
      id="before-after"
      aria-label="Before and After Comparison"
      className="bg-white py-14 text-[#06151E] md:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[1280px] px-6 md:px-10 lg:px-20">
        {/* Section Overline */}
        <p className="font-mono text-[11px] tracking-[0.15em] text-[#898A8C] uppercase md:text-[12px]">
          07 / Before &amp; After
        </p>

        {/* Section Heading */}
        <h2 className="mt-3 font-sans text-[32px] leading-[1.1] font-semibold tracking-[-0.02em] text-[#06151E] md:text-[40px] lg:text-[48px]">
          Less disconnected work. More
          <br className="hidden sm:inline" /> operational clarity.
        </h2>

        {/* Supporting Narrative */}
        <p className="mt-4 max-w-[720px] font-sans text-[16px] leading-[1.55] text-[#545A5B] md:text-[17px]">
          A qualitative view of the shift from fragmented coordination to a
          connected creative operation.
        </p>

        {/* Desktop / Tablet Two-Column Comparison Grid (md: >=768px) */}
        <div className="mt-12 hidden overflow-hidden rounded-xl border border-[#D6D6D6] shadow-sm md:mt-16 md:block">
          {/* Header Row */}
          <div className="grid grid-cols-2">
            <div className="border-r border-b border-[#D6D6D6] bg-white p-4">
              <span className="font-mono text-[11px] tracking-wider text-[#545A5B] uppercase">
                Before / Disconnected coordination
              </span>
            </div>
            <div className="border-b border-[#06151E] bg-[#06151E] p-4">
              <span className="font-mono text-[11px] tracking-wider text-[#D6D6D6] uppercase">
                After / With AI NEX OS
              </span>
            </div>
          </div>

          {/* Comparison Rows */}
          {COMPARISONS.map((row, idx) => (
            <div key={idx} className="grid grid-cols-2">
              <div
                className={`border-r border-[#D6D6D6] bg-white p-5 text-[15px] text-[#545A5B] ${
                  idx < COMPARISONS.length - 1
                    ? "border-b border-[#D6D6D6]"
                    : ""
                }`}
              >
                {row.before}
              </div>
              <div
                className={`bg-[#06151E] p-5 text-[15px] font-medium text-white ${
                  idx < COMPARISONS.length - 1
                    ? "border-b border-[#545A5B]/30"
                    : ""
                }`}
              >
                {row.after}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Stacked Adjacent Cards (< 768px) */}
        <div className="mt-10 block space-y-4 md:hidden">
          {COMPARISONS.map((row, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-lg border border-[#D6D6D6] shadow-xs"
            >
              {/* Before Block */}
              <div className="border-b border-[#D6D6D6] bg-white p-4">
                <span className="font-mono text-[10px] tracking-wider text-[#898A8C] uppercase">
                  Before
                </span>
                <p className="mt-1 text-[14px] text-[#545A5B]">{row.before}</p>
              </div>

              {/* After Block */}
              <div className="bg-[#06151E] p-4 text-white">
                <span className="font-mono text-[10px] tracking-wider text-[#D6D6D6] uppercase">
                  With AI NEX OS
                </span>
                <p className="mt-1 text-[14px] font-medium text-white">
                  {row.after}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
