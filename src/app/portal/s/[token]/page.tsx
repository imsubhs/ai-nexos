import { ShieldCheck } from "lucide-react";
import { getPortalReviewData } from "@/features/deliverables/actions";
import { PortalReviewWorkspace } from "@/features/deliverables/components/portal-review-workspace";

/**
 * Secure share-link entry: portal.<domain>/s/{secure_token} or /portal/s/{secure_token}.
 * External Client Review Workspace (Phase 4G).
 * Authenticates via cryptographically valid share token; projects strictly external DTO.
 */
export default async function ShareLinkPage({
  params,
}: Readonly<{ params: Promise<{ token: string }> }>) {
  const { token } = await params;
  const reviewResult = await getPortalReviewData(token);

  if (!reviewResult.valid || !reviewResult.data) {
    return (
      <main className="flex min-h-[70svh] flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="bg-[#11212D] flex size-12 items-center justify-center rounded-full border border-[#253745]">
          <ShieldCheck className="text-[#9BA8AB] size-6" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-[#F5F7F8]">
          This review link is not active
        </h1>
        <p className="text-[#9BA8AB] max-w-sm text-sm text-balance">
          {reviewResult.error ||
            "The share link you opened is invalid, expired, or no longer available. Please ask your project contact for a new link."}
        </p>
      </main>
    );
  }

  return <PortalReviewWorkspace initialData={reviewResult.data} />;
}

