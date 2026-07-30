/**
 * Sprint 12B — notification template rendering (technical-debt item 11).
 *
 * The notifications read model carries no headline: the subject and body live in
 * `notification_templates` and the values live in the event payload. This is the
 * substitution layer both adapters share, so a bug here would show identical
 * wrong copy in demo and production — worth pinning down.
 */
import { describe, expect, it } from "vitest";
import {
  composeNotification,
  renderTemplate,
  type NotificationTemplate,
} from "@/features/notifications/templates";

const NOTIFICATION = {
  notificationId: "n1",
  eventId: "e1",
  priority: "normal",
  status: "delivered",
  readAt: null,
  createdAt: new Date("2026-07-01T09:00:00.000Z"),
};

const EVENT = {
  eventType: "deliverable",
  aggregateType: "deliverable",
  payload: { title: "Brand Guidelines v2", status: "client_review", actorName: "Ada" },
};

const TEMPLATE: NotificationTemplate = {
  eventType: "deliverable",
  channel: "in_app",
  subjectTemplate: "Deliverable updated: {{title}}",
  bodyTemplate: "{{actorName}} moved “{{title}}” to {{status}}.",
  actionUrlTemplate: "/deliverables",
};

describe("renderTemplate", () => {
  it("substitutes a flat token", () => {
    expect(renderTemplate("Hello {{name}}", { name: "Ada" })).toBe("Hello Ada");
  });

  it("substitutes a dotted path", () => {
    expect(renderTemplate("{{a.b.c}}", { a: { b: { c: "deep" } } })).toBe("deep");
  });

  it("tolerates whitespace inside the braces", () => {
    expect(renderTemplate("{{  name  }}", { name: "Ada" })).toBe("Ada");
  });

  it("renders an em dash rather than 'undefined' for a missing key", () => {
    expect(renderTemplate("Hello {{missing}}", {})).toBe("Hello —");
    expect(renderTemplate("{{a.b}}", { a: null })).toBe("—");
    expect(renderTemplate("{{blank}}", { blank: "" })).toBe("—");
  });

  it("substitutes every occurrence, not just the first", () => {
    expect(renderTemplate("{{n}} and {{n}}", { n: 2 })).toBe("2 and 2");
  });

  it("leaves non-token braces alone", () => {
    expect(renderTemplate("a {b} c", {})).toBe("a {b} c");
  });

  it("does not treat a payload value as a template itself", () => {
    // Guards against a second substitution pass rendering user data as tokens.
    expect(renderTemplate("{{name}}", { name: "{{secret}}", secret: "leaked" })).toBe(
      "{{secret}}",
    );
  });
});

describe("composeNotification", () => {
  it("renders subject, body and action URL from the template", () => {
    const item = composeNotification(NOTIFICATION, EVENT, TEMPLATE);
    expect(item.title).toBe("Deliverable updated: Brand Guidelines v2");
    expect(item.description).toBe("Ada moved “Brand Guidelines v2” to client_review.");
    expect(item.actionUrl).toBe("/deliverables");
    expect(item.isFallbackTitle).toBe(false);
  });

  it("carries the notification's own fields through unchanged", () => {
    const item = composeNotification(NOTIFICATION, EVENT, TEMPLATE);
    expect(item.notificationId).toBe("n1");
    expect(item.priority).toBe("normal");
    expect(item.status).toBe("delivered");
    expect(item.readAt).toBeNull();
    expect(item.eventType).toBe("deliverable");
  });

  it("falls back to the event when no template matches", () => {
    const item = composeNotification(NOTIFICATION, EVENT, null);
    expect(item.title).toBe("Deliverable · Deliverable");
    expect(item.description).toBeNull();
    expect(item.actionUrl).toBeNull();
    expect(item.isFallbackTitle).toBe(true);
  });

  it("still produces a title when the event itself is missing", () => {
    // The event store is prunable; a notification must never render blank.
    const item = composeNotification(NOTIFICATION, null, null);
    expect(item.title).toBe("Notification");
    expect(item.isFallbackTitle).toBe(true);
  });

  it("renders em dashes when the template asks for a key the payload lacks", () => {
    const item = composeNotification(
      NOTIFICATION,
      { ...EVENT, payload: { title: "Only a title" } },
      TEMPLATE,
    );
    expect(item.title).toBe("Deliverable updated: Only a title");
    expect(item.description).toBe("— moved “Only a title” to —.");
  });

  it("omits the action URL when the template has none", () => {
    const item = composeNotification(NOTIFICATION, EVENT, {
      ...TEMPLATE,
      actionUrlTemplate: null,
    });
    expect(item.actionUrl).toBeNull();
  });
});
