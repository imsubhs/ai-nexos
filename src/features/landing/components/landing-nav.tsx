"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Intelligence", href: "#intelligence" },
  { label: "Security", href: "#security" },
] as const;

export function LandingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Close mobile menu on Escape key press
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // Smooth scroll handler for anchor links
  const handleAnchorClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      setMobileMenuOpen(false);
      const targetId = href.replace("#", "");
      if (targetId === "product") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#545A5B]/40 bg-[#06151E]/95 backdrop-blur-md transition-colors">
      {/* Primary Header Row */}
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6 md:px-10 lg:px-20">
        {/* Brand Logotype */}
        <Link
          href="#product"
          onClick={(e) => handleAnchorClick(e, "#product")}
          className="group flex items-center gap-2.5 rounded-sm text-base font-bold tracking-tight text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#D6D6D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06151E] focus-visible:outline-none"
        >
          <span className="font-sans text-[17px] font-semibold tracking-[-0.02em] text-white">
            AI NEX OS
          </span>
        </Link>

        {/* Desktop Center Navigation (Visible on lg: >=1200px) */}
        <nav
          aria-label="Main Navigation"
          className="hidden items-center gap-8 lg:flex"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleAnchorClick(e, link.href)}
              className="rounded-sm py-1 text-[14px] font-medium text-[#898A8C] transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#D6D6D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06151E] focus-visible:outline-none"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-4 md:gap-6">
          {/* Log In Link */}
          <Link
            href="/login"
            className="rounded-sm py-1.5 text-[14px] font-medium text-white transition-colors hover:text-[#D6D6D6] focus-visible:ring-2 focus-visible:ring-[#D6D6D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06151E] focus-visible:outline-none"
          >
            Log In
          </Link>

          {/* Desktop/Tablet Primary CTA */}
          <Link
            href="/login"
            className="hidden h-10 items-center justify-center gap-1.5 rounded-[8px] bg-[#D6D6D6] px-4 text-[14px] font-semibold text-[#06151E] shadow-xs transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-[#D6D6D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06151E] focus-visible:outline-none active:bg-[#D6D6D6] sm:inline-flex"
          >
            <span>Get Started</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>

          {/* Mobile Menu Toggle Button (Visible on mobile <768px) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
            aria-label={
              mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            className="inline-flex size-10 items-center justify-center rounded-lg border border-[#545A5B] text-white hover:bg-[#545A5B]/20 focus-visible:ring-2 focus-visible:ring-[#D6D6D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06151E] focus-visible:outline-none sm:hidden"
          >
            {mobileMenuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Tablet Second Navigation Row (768px to 1199px) */}
      <div className="hidden border-t border-[#545A5B]/30 bg-[#06151E] px-6 py-2.5 sm:flex md:px-10 lg:hidden">
        <nav
          aria-label="Tablet Sub-Navigation"
          className="mx-auto flex flex-wrap items-center justify-center gap-6"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleAnchorClick(e, link.href)}
              className="rounded-sm py-1 text-[13px] font-medium text-[#898A8C] transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#D6D6D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06151E] focus-visible:outline-none"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      {/* Mobile Drawer Navigation (< 768px) */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-menu"
          className="animate-in slide-in-from-top-2 border-t border-[#545A5B]/40 bg-[#06151E] px-6 py-5 duration-200 sm:hidden"
        >
          <nav aria-label="Mobile Navigation" className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleAnchorClick(e, link.href)}
                className="block border-b border-[#545A5B]/20 py-2 text-[15px] font-medium text-[#898A8C] hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#D6D6D6] text-[15px] font-semibold text-[#06151E] transition-colors hover:bg-white"
              >
                <span>Get Started</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
