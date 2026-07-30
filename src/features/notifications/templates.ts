/**
 * Notification template rendering (Sprint 12B · Phase 4).
 *
 * The notifications read model is event-derived by design: a row carries an
 * `eventId`, a priority and a delivery status, and nothing else. The headline
 * lives in `notification_templates` (subject / body / action URL, keyed by
 * event type and channel) and the values live in the event's payload. Sprint
 * 12A could not render a title because no read performed that join; this module
 * is the substitution half of it, shared by the real and mock adapters so both
 * produce identical copy.
 *
 * Substitution is deliberately dumb: `{{path.to.value}}` looked up in the
 * payload, missing keys left as an em dash rather than printing "undefined".
 */

export type NotificationTemplate = {
  eventType: string;
  channel: string;
  subjectTemplate: string;
  bodyTemplate: string;
  actionUrlTemplate: string | null;
};

const TOKEN = /\{\{\s*([\w.]+)\s*\}\}/g;

function lookup(payload: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === "object"
          ? (value as Record<string, unknown>)[key]
          : undefined,
      payload,
    );
}

export function renderTemplate(template: string, payload: unknown): string {
  return template.replace(TOKEN, (_match, path: string) => {
    const value = lookup(payload, path);
    if (value === undefined || value === null || value === "") return "—";
    return String(value);
  });
}

/**
 * The shape the bell renders. `title` always resolves to something readable:
 * a template when one exists for the event type, otherwise a humanised event
 * type, so a notification is never a blank row.
 */
export type NotificationFeedItem = {
  notificationId: string;
  eventId: string;
  eventType: string | null;
  aggregateType: string | null;
  priority: string;
  status: string;
  readAt: Date | string | null;
  createdAt: Date | string;
  title: string;
  description: string | null;
  actionUrl: string | null;
  /** True when no template matched and the title was derived from the event. */
  isFallbackTitle: boolean;
};

function humanize(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Compose one feed item from a notification row, its event (may be missing if
 * the event store has been pruned) and the best matching template.
 */
export function composeNotification(
  notification: {
    notificationId: string;
    eventId: string;
    priority: string;
    status: string;
    readAt: Date | string | null;
    createdAt: Date | string;
  },
  event: {
    eventType: string;
    aggregateType: string;
    payload: unknown;
  } | null,
  template: NotificationTemplate | null,
): NotificationFeedItem {
  const payload = event?.payload ?? {};

  if (template) {
    return {
      notificationId: notification.notificationId,
      eventId: notification.eventId,
      eventType: event?.eventType ?? null,
      aggregateType: event?.aggregateType ?? null,
      priority: notification.priority,
      status: notification.status,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      title: renderTemplate(template.subjectTemplate, payload),
      description: renderTemplate(template.bodyTemplate, payload),
      actionUrl: template.actionUrlTemplate
        ? renderTemplate(template.actionUrlTemplate, payload)
        : null,
      isFallbackTitle: false,
    };
  }

  // No template for this event type / channel. The event still tells us what
  // happened and to what, which beats "normal priority · delivered".
  const fallbackTitle = event
    ? `${humanize(event.aggregateType)} · ${humanize(event.eventType)}`
    : "Notification";

  return {
    notificationId: notification.notificationId,
    eventId: notification.eventId,
    eventType: event?.eventType ?? null,
    aggregateType: event?.aggregateType ?? null,
    priority: notification.priority,
    status: notification.status,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
    title: fallbackTitle,
    description: null,
    actionUrl: null,
    isFallbackTitle: true,
  };
}
