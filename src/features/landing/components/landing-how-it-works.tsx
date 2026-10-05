import * as React from "react";

const WORKFLOW_STAGES = [
  {
    num: "01",
    title: "Clients",
    desc: "Keep the brief and client context connected to the work.",
    highlight: false,
  },
  {
    num: "02",
    title: "Projects",
    desc: "Organize the scope, timeline and delivery path.",
    highlight: false,
  },
  {
    num: "03",
    title: "Tasks",
    desc: "Give each piece of work an owner and a status.",
    highlight: false,
  },
  {
    num: "04",
    title: "Assets",
    desc: "Keep working materials alongside the project.",
    highlight: false,
  },
  {
    num: "05",
    title: "Deliverables",
    desc: "Connect the output to the work that produced it.",
    highlight: false,
  },
  {
    num: "06",
    title: "Review",
    desc: "Bring client feedback into the delivery process.",
    highlight: false,
  },
  {
    num: "07",
    title: "Approval",
    desc: "Make the sign-off state clear to the team.",
    highlight: false,
  },
  {
    num: "08",
    title: "Intelligence",
    desc: "See delivery status, pending reviews and workload.",
    highlight: true, // Special visual badge in design
  },
] as const;

export function LandingHowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-label="How AI NEX OS Works"
      className="bg-white py-14 text-[#06151E] md:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[1280px] px-6 md:px-10 lg:px-20">
        {/* Section Overline */}
        <p className="font-mono text-[11px] tracking-[0.15em] text-[#898A8C] uppercase md:text-[12px]">
          01 / How It Works
        </p>

        {/* Section Heading */}
        <h2 className="mt-3 font-sans text-[32px] leading-[1.1] font-semibold tracking-[-0.02em] text-[#06151E] md:text-[40px] lg:text-[48px]">
          From client context to a clear
          <br className="hidden sm:inline" /> delivery path.
        </h2>

        {/* Supporting Narrative */}
        <p className="mt-4 max-w-[720px] font-sans text-[16px] leading-[1.55] text-[#545A5B] md:text-[17px]">
          One connected workflow, not a collection of disconnected handoffs.
          Each stage carries the context the next stage needs.
        </p>

        {/* Connected Workflow Horizontal Chain */}
        <div className="my-8 scrollbar-none overflow-x-auto border-y border-[#D6D6D6] py-4 md:my-12">
          <p className="font-mono text-[13px] tracking-tight whitespace-nowrap text-[#06151E] md:text-[14px]">
            Clients → Projects → Tasks → Assets → Deliverables → Review →
            Approval → Intelligence
          </p>
        </div>

        {/* 8 Workflow Stage Cards Grid (4 cols desktop, 2 cols tablet, 1 col mobile) */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {WORKFLOW_STAGES.map((stage) => (
            <div
              key={stage.num}
              className="flex flex-col justify-start rounded-lg border border-[#D6D6D6]/80 p-5 transition-colors hover:border-[#898A8C] md:p-6"
            >
              {/* Badge indicator */}
              <div className="mb-3 flex items-center">
                <span
                  className={`inline-flex size-7 items-center justify-center rounded font-mono text-[12px] font-medium ${
                    stage.highlight
                      ? "bg-[#06151E] text-white"
                      : "border border-[#D6D6D6] bg-white text-[#06151E]"
                  }`}
                >
                  {stage.num}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-[19px] font-semibold text-[#06151E] md:text-[20px]">
                {stage.title}
              </h3>

              {/* Description */}
              <p className="mt-2 text-[14px] leading-relaxed text-[#545A5B]">
                {stage.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
