export const PortalFeatureFlags = {
  ENABLE_DASHBOARD_V1: 'enable_dashboard_v1',
  ENABLE_DASHBOARD_DRAG_AND_DROP: 'enable_dashboard_drag_and_drop', // Reserved for future
  ENABLE_SHARE_SESSION_COMMENTS: 'enable_share_session_comments',
  ENABLE_REVISION_REQUESTS: 'enable_revision_requests',
  ENABLE_MFA: 'enable_mfa',
} as const;

export type PortalFeatureFlag = typeof PortalFeatureFlags[keyof typeof PortalFeatureFlags];

export async function isFeatureEnabled(clientId: string, flag: PortalFeatureFlag): Promise<boolean> {
  const defaults: Record<PortalFeatureFlag, boolean> = {
    enable_dashboard_v1: true,
    enable_dashboard_drag_and_drop: false,
    enable_share_session_comments: true,
    enable_revision_requests: true,
    enable_mfa: false,
  };
  
  return defaults[flag];
}
