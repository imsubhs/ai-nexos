import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  shareSessions,
  shareSessionItems,
  sharePolicies,
  sharePermissions,
  shareRecipients,
  externalIdentities,
  shareComments,
  shareAnnotations,
  shareActivity,
  shareEvents,
  shareAccessLogs,
  shareDownloadLogs,
  shareSecurityLogs,
  shareNotifications,
  shareExpiration,
  sharePasswords,
  shareWatermarks,
  shareVersions,
  shareLabels,
  shareTags,
} from "@/db/schema/shares";

// 1. External Identities
export type ExternalIdentity = InferSelectModel<typeof externalIdentities>;
export type NewExternalIdentity = InferInsertModel<typeof externalIdentities>;

// 2. Share Policies
export type SharePolicy = InferSelectModel<typeof sharePolicies>;
export type NewSharePolicy = InferInsertModel<typeof sharePolicies>;

// 3. Share Sessions
export type ShareSession = InferSelectModel<typeof shareSessions>;
export type NewShareSession = InferInsertModel<typeof shareSessions>;

// 4. Share Session Items
export type ShareSessionItem = InferSelectModel<typeof shareSessionItems>;
export type NewShareSessionItem = InferInsertModel<typeof shareSessionItems>;

// 5. Share Recipients
export type ShareRecipient = InferSelectModel<typeof shareRecipients>;
export type NewShareRecipient = InferInsertModel<typeof shareRecipients>;

// 6. Share Permissions
export type SharePermission = InferSelectModel<typeof sharePermissions>;
export type NewSharePermission = InferInsertModel<typeof sharePermissions>;

// 7. Share Comments
export type ShareComment = InferSelectModel<typeof shareComments>;
export type NewShareComment = InferInsertModel<typeof shareComments>;

// 8. Share Annotations
export type ShareAnnotation = InferSelectModel<typeof shareAnnotations>;
export type NewShareAnnotation = InferInsertModel<typeof shareAnnotations>;

// 9. Share Activity
export type ShareActivity = InferSelectModel<typeof shareActivity>;
export type NewShareActivity = InferInsertModel<typeof shareActivity>;

// 10. Share Events
export type ShareEvent = InferSelectModel<typeof shareEvents>;
export type NewShareEvent = InferInsertModel<typeof shareEvents>;

// 11. Share Access Logs
export type ShareAccessLog = InferSelectModel<typeof shareAccessLogs>;
export type NewShareAccessLog = InferInsertModel<typeof shareAccessLogs>;

// 12. Share Download Logs
export type ShareDownloadLog = InferSelectModel<typeof shareDownloadLogs>;
export type NewShareDownloadLog = InferInsertModel<typeof shareDownloadLogs>;

// 13. Share Security Logs
export type ShareSecurityLog = InferSelectModel<typeof shareSecurityLogs>;
export type NewShareSecurityLog = InferInsertModel<typeof shareSecurityLogs>;

// 14. Share Notifications
export type ShareNotification = InferSelectModel<typeof shareNotifications>;
export type NewShareNotification = InferInsertModel<typeof shareNotifications>;

// 15. Share Expiration
export type ShareExpiration = InferSelectModel<typeof shareExpiration>;
export type NewShareExpiration = InferInsertModel<typeof shareExpiration>;

// 16. Share Passwords
export type SharePassword = InferSelectModel<typeof sharePasswords>;
export type NewSharePassword = InferInsertModel<typeof sharePasswords>;

// 17. Share Watermarks
export type ShareWatermark = InferSelectModel<typeof shareWatermarks>;
export type NewShareWatermark = InferInsertModel<typeof shareWatermarks>;

// 18. Share Versions
export type ShareVersion = InferSelectModel<typeof shareVersions>;
export type NewShareVersion = InferInsertModel<typeof shareVersions>;

// 19. Share Labels
export type ShareLabel = InferSelectModel<typeof shareLabels>;
export type NewShareLabel = InferInsertModel<typeof shareLabels>;

// 20. Share Tags
export type ShareTag = InferSelectModel<typeof shareTags>;
export type NewShareTag = InferInsertModel<typeof shareTags>;

// UI Abstraction Types for Asset Viewer
export type ViewerFormat = "IMAGE" | "VIDEO" | "PDF" | "UNKNOWN";

export interface NormalizedCoordinates {
  normX: number;
  normY: number;
  normWidth?: number;
  normHeight?: number;
}
