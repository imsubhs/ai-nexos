import * as React from "react";
import Link from "next/link";

interface FooterLink {
  label: string;
  href: string;
  isExternal?: boolean;
}

const PRODUCT_LINKS: FooterLink[] = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Intelligence", href: "#intelligence" },
  { label: "Security", href: "#security" },
  { label: "Client Portal", href: "#client-portal" },
];

const WORKSPACE_LINKS: FooterLink[] = [
  { label: "Projects", href: "/login" },
  { label: "Clients", href: "/login" },
  { label: "Deliverables", href: "/login" },
  { label: "Production DAM", href: "/login" },
  { label: "Workforce Pods", href: "/login" },
];

const GOVERNANCE_LINKS: FooterLink[] = [
  { label: "Log In", href: "/login" },
  { label: "Get Started", href: "/login" },
  { label: "Documentation", href: "/login" },
  { label: "Privacy Policy", href: "#privacy" },
  { label: "Terms of Service", href: "#terms" },
];

export function LandingFooter() {
  return (
    <footer
      aria-label="Footer"
      className="border-t border-[#545A5B]/30 bg-[#06151E] text-white"
    >
      <div className="mx-auto max-w-[1280px] px-6 py-14 md:px-10 lg:px-20 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link
              href="#product"
              className="inline-block rounded-sm font-sans text-[18px] font-semibold tracking-[-0.02em] text-white transition-colors hover:text-[#D6D6D6] focus-visible:ring-2 focus-visible:ring-[#D6D6D6] focus-visible:outline-none"
            >
              AI NEX OS
            </Link>
            <p className="mt-3 max-w-[340px] font-sans text-[14px] leading-relaxed text-[#898A8C]">
              The Operating System for Creative Execution. Unifying project
              architecture, client review loops, operational governance, and
              multi-disciplinary talent.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#545A5B]/40 bg-[#545A5B]/10 px-3 py-1 font-mono text-[11px] text-[#898A8C]">
                <span className="size-1.5 rounded-full bg-[#D6D6D6]" />
                SYSTEM PRODUCTION V4.9
              </span>
            </div>
          </div>

          {/* Navigation Columns */}
          <div>
            <h3 className="font-mono text-[11px] tracking-[0.16em] text-[#898A8C] uppercase">
              Product
            </h3>
            <ul className="mt-4 space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="rounded-sm font-sans text-[14px] text-[#898A8C] transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#D6D6D6] focus-visible:outline-none"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[11px] tracking-[0.16em] text-[#898A8C] uppercase">
              Workspaces
            </h3>
            <ul className="mt-4 space-y-2.5">
              {WORKSPACE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="rounded-sm font-sans text-[14px] text-[#898A8C] transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#D6D6D6] focus-visible:outline-none"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[11px] tracking-[0.16em] text-[#898A8C] uppercase">
              Governance
            </h3>
            <ul className="mt-4 space-y-2.5">
              {GOVERNANCE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="rounded-sm font-sans text-[14px] text-[#898A8C] transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#D6D6D6] focus-visible:outline-none"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Legal & Meta Bottom Bar */}
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-[#545A5B]/20 pt-8 sm:flex-row sm:items-center">
          <p className="font-mono text-[12px] text-[#898A8C]">
            © {new Date().getFullYear()} AI NEX OS. All rights reserved.
          </p>
          <p className="font-mono text-[11px] tracking-wider text-[#898A8C] uppercase">
            DESIGNED FOR CREATIVE EXECUTION.
          </p>
        </div>
      </div>
    </footer>
  );
}
