/**
 * Deliverable vocabularies, mirroring deliverableStatusEnum /
 * deliverableTypeEnum / reviewTypeEnum / shareLinkAccessLevelEnum in
 * src/db/schema/enums.ts.
 *
 * Sprint 12A (P2-01): the status filter previously exposed 8 of the schema's
 * 12 statuses, so four legitimate pipeline states could never be filtered.
 * The list below is the whole enum, in pipeline order.
 */

export const DELIVERABLE_STATUSES = [
  "draft",
  "preparing",
  "internal_review",
  "creative_review",
  "qa",
  "ready_for_client",
  "client_review",
  "revision_requested",
  "approved",
  "rejected",
  "delivered",
  "archived",
] as const;

export const DELIVERABLE_TYPES = [
  "storyboard",
  "script",
  "prompt_pack",
  "prompt_collection",
  "moodboard",
  "character_sheet",
  "character_pack",
  "scene_pack",
  "image_set",
  "video_draft",
  "final_video",
  "voice_over",
  "audio_mix",
  "animation",
  "presentation",
  "brand_identity",
  "logo_package",
  "marketing_campaign",
  "social_media_kit",
  "website",
  "landing_page",
  "documentation",
  "contract",
  "invoice",
  "proposal",
  "other",
] as const;

export const REVIEW_TYPES = [
  "internal_review",
  "creative_director",
  "qa",
  "legal",
  "client_review",
  "executive_review",
  "final_approval",
] as const;

export const SHARE_ACCESS_LEVELS = [
  "view_only",
  "comment_only",
  "approval_only",
] as const;

/** snake_case → "Title Case". */
export function humanizeToken(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
