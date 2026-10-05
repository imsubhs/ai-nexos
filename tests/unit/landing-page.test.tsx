import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LandingPageView } from "@/features/landing/components/landing-page-view";
import RootPage, { metadata } from "@/app/page";

describe("AI NEX OS Landing Page", () => {
  it("exports appropriate SEO metadata for the public landing page", () => {
    expect(metadata.title).toBe(
      "AI NEX OS · The Operating System for Creative Execution",
    );
    expect(metadata.description).toBeDefined();
    expect(metadata.alternates?.canonical).toBe("/");
    expect((metadata.openGraph as Record<string, unknown>)?.type).toBe(
      "website",
    );
  });

  it("renders the root page successfully", () => {
    const { container } = render(<RootPage />);
    expect(container).toBeInTheDocument();
  });

  it("includes an accessible skip link targeting #main-content", () => {
    render(<LandingPageView />);
    const skipLink = screen.getByText("Skip to main content");
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  it("renders global navigation with branding and anchor links", () => {
    render(<LandingPageView />);
    // Brand logos (in header and footer)
    const brandLinks = screen.getAllByRole("link", { name: /^AI NEX OS/i });
    expect(brandLinks.length).toBeGreaterThanOrEqual(1);

    // Nav anchor links
    const productLinks = screen.getAllByText("Product");
    expect(productLinks.length).toBeGreaterThanOrEqual(1);

    const howItWorksLinks = screen.getAllByText("How It Works");
    expect(howItWorksLinks.length).toBeGreaterThanOrEqual(1);

    const capabilitiesLinks = screen.getAllByText("Capabilities");
    expect(capabilitiesLinks.length).toBeGreaterThanOrEqual(1);

    const intelligenceLinks = screen.getAllByText("Intelligence");
    expect(intelligenceLinks.length).toBeGreaterThanOrEqual(1);

    const securityLinks = screen.getAllByText("Security");
    expect(securityLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("routes 'Get Started' and 'Log In' CTAs directly to /login", () => {
    render(<LandingPageView />);
    const getStartedButtons = screen.getAllByRole("link", {
      name: /get started/i,
    });
    expect(getStartedButtons.length).toBeGreaterThanOrEqual(2);
    getStartedButtons.forEach((btn) => {
      expect(btn).toHaveAttribute("href", "/login");
    });

    const logInButtons = screen.getAllByRole("link", { name: /log in/i });
    expect(logInButtons.length).toBeGreaterThanOrEqual(2);
    logInButtons.forEach((btn) => {
      expect(btn).toHaveAttribute("href", "/login");
    });
  });

  it("contains all required landmark sections and section anchors", () => {
    const { container } = render(<LandingPageView />);

    expect(container.querySelector("#main-content")).toBeInTheDocument();
    expect(container.querySelector("#product")).toBeInTheDocument();
    expect(container.querySelector("#how-it-works")).toBeInTheDocument();
    expect(container.querySelector("#capabilities")).toBeInTheDocument();
    expect(container.querySelector("#client-portal")).toBeInTheDocument();
    expect(container.querySelector("#intelligence")).toBeInTheDocument();
    expect(container.querySelector("#security")).toBeInTheDocument();
    expect(container.querySelector("#who-its-for")).toBeInTheDocument();
    expect(container.querySelector("#before-after")).toBeInTheDocument();
    expect(container.querySelector("#get-started")).toBeInTheDocument();
  });

  it("renders 8 workflow stages in 'How It Works'", () => {
    render(<LandingPageView />);
    const expectedStages = [
      "Clients",
      "Projects",
      "Tasks",
      "Assets",
      "Deliverables",
      "Review",
      "Approval",
      "Intelligence",
    ];

    expectedStages.forEach((title) => {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    });

    ["01", "02", "03", "04", "05", "06", "07", "08"].forEach((num) => {
      expect(screen.getByText(num)).toBeInTheDocument();
    });
  });

  it("supports accessible mobile menu toggle with correct aria attributes", () => {
    render(<LandingPageView />);
    const menuToggle = screen.getByRole("button", {
      name: /open navigation menu/i,
    });
    expect(menuToggle).toBeInTheDocument();
    expect(menuToggle).toHaveAttribute("aria-expanded", "false");
    expect(menuToggle).toHaveAttribute("aria-controls", "mobile-nav-menu");

    fireEvent.click(menuToggle);
    expect(menuToggle).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", { name: /close navigation menu/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Mobile Navigation" }),
    ).toBeInTheDocument();

    fireEvent.click(menuToggle);
    expect(menuToggle).toHaveAttribute("aria-expanded", "false");
  });

  it("renders footer with legal bar and design credit", () => {
    render(<LandingPageView />);
    expect(screen.getByText(/All rights reserved/i)).toBeInTheDocument();
    expect(
      screen.getByText(/DESIGNED FOR CREATIVE EXECUTION/i),
    ).toBeInTheDocument();
  });
});
