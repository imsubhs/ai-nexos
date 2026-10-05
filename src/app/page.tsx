import type { Metadata } from "next";
import { LandingPageView } from "@/features/landing/components/landing-page-view";

export const metadata: Metadata = {
  title: "AI NEX OS · The Operating System for Creative Execution",
  description:
    "An integrated operating environment connecting client review, multi-role workforce orchestration, timeline governance, and executive intelligence.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AI NEX OS · The Operating System for Creative Execution",
    description:
      "An integrated operating environment connecting client review, multi-role workforce orchestration, timeline governance, and executive intelligence.",
    url: "/",
    siteName: "AI NEX OS",
    type: "website",
  },
};

export default function RootPage() {
  return <LandingPageView />;
}
