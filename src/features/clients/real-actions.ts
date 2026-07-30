"use server";

import { db } from "@/db";
import { activityLogs, clientContacts, clients } from "@/db/schema";
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { and, eq, ilike, inArray, isNull, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  insertClientSchema,
  insertContactSchema,
  updateClientSchema,
  updateContactSchema,
} from "./schemas";

function logActivity(
  orgId: string,
  userId: string,
  action: string,
  entityId: string,
  entityType: string,
  description: string,
  metadata?: Record<string, unknown>
) {
  return db.insert(activityLogs).values({
    organizationId: orgId,
    userId,
    module: "clients",
    action,
    entityType,
    entityId,
    description,
    metadata,
  });
}

/**
 * Retrieves a list of active clients for the current organization.
 * Supports optional search filtering by company name.
 * Requires `clients.read` permission.
 */
export async function getClients(query?: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "clients", "read");

  // RLS handles the organization scoping, but passing it explicitly is safe too
  const filters = [isNull(clients.deletedAt), eq(clients.organizationId, user.organizationId)];
  if (query) {
    filters.push(ilike(clients.companyName, `%${query}%`));
  }

  const data = await db
    .select()
    .from(clients)
    .where(and(...filters))
    .orderBy(clients.createdAt);

  return data;
}

/**
 * Retrieves a specific client by ID along with their active contacts.
 * Scoped to the current organization.
 * Requires `clients.read` permission.
 */
export async function getClientById(clientId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "clients", "read");

  const data = await db.query.clients.findFirst({
    where: and(
      eq(clients.clientId, clientId),
      eq(clients.organizationId, user.organizationId),
      isNull(clients.deletedAt)
    ),
    with: {
      contacts: {
        where: isNull(clientContacts.deletedAt),
      },
    },
  });

  return data ?? null;
}

/**
 * Retrieves the activity log history for a specific client.
 * Includes both client-level and contact-level activities.
 * Requires `clients.read` permission.
 */
export async function getClientActivity(clientId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "clients", "read");

  // Since entityId could be client or contact, we filter by entityId
  const data = await db
    .select()
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.organizationId, user.organizationId),
        eq(activityLogs.entityId, clientId),
        inArray(activityLogs.entityType, ["client", "client_contact"])
      )
    )
    .orderBy(activityLogs.createdAt);

  return data;
}

/**
 * Creates a new client profile.
 * Automatically logs the creation activity.
 * Requires `clients.create` permission.
 */
export async function createClient(data: z.infer<typeof insertClientSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "clients", "create");

  const parsed = insertClientSchema.parse(data);

  const [client] = await db
    .insert(clients)
    .values({
      ...parsed,
      organizationId: user.organizationId,
      createdBy: user.userId,
      updatedBy: user.userId,
    })
    .returning({ clientId: clients.clientId });

  await logActivity(
    user.organizationId,
    user.userId,
    "create",
    client.clientId,
    "client",
    `Created client ${parsed.companyName}`,
    parsed
  );

  revalidatePath("/clients");
  return client;
}

/**
 * Updates an existing client profile.
 * Automatically logs the update activity.
 * Requires `clients.update` permission.
 */
export async function updateClient(clientId: string, data: z.infer<typeof updateClientSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "clients", "update");

  const parsed = updateClientSchema.parse(data);

  const [client] = await db
    .update(clients)
    .set({
      ...parsed,
      updatedBy: user.userId,
      updatedAt: new Date(),
    })
    .where(and(eq(clients.clientId, clientId), eq(clients.organizationId, user.organizationId)))
    .returning({ clientId: clients.clientId, companyName: clients.companyName });

  if (!client) throw new Error("Client not found");

  await logActivity(
    user.organizationId,
    user.userId,
    "update",
    client.clientId,
    "client",
    `Updated client ${client.companyName}`,
    parsed
  );

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return client;
}

/**
 * Soft-deletes (archives) a client profile and all of its associated contacts.
 * Automatically logs the archival activity.
 * Requires `clients.delete` permission.
 */
export async function archiveClient(clientId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "clients", "delete");

  const [client] = await db
    .update(clients)
    .set({
      deletedAt: new Date(),
      deletedBy: user.userId,
      isArchived: true,
      status: "archived",
      updatedAt: new Date(),
      updatedBy: user.userId,
    })
    .where(and(eq(clients.clientId, clientId), eq(clients.organizationId, user.organizationId)))
    .returning({ clientId: clients.clientId, companyName: clients.companyName });

  if (!client) throw new Error("Client not found");

  // Soft delete all associated contacts
  await db
    .update(clientContacts)
    .set({
      deletedAt: new Date(),
      deletedBy: user.userId,
      isArchived: true,
      status: "archived",
      updatedAt: new Date(),
      updatedBy: user.userId,
    })
    .where(and(eq(clientContacts.clientId, clientId), isNull(clientContacts.deletedAt)));


  await logActivity(
    user.organizationId,
    user.userId,
    "archive",
    client.clientId,
    "client",
    `Archived client ${client.companyName}`
  );

  revalidatePath("/clients");
  return client;
}

/**
 * Creates a new contact associated with a specific client.
 * Logs the activity against the parent client's feed.
 * Requires `clients.update` permission on the parent client.
 */
export async function createContact(data: z.infer<typeof insertContactSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "clients", "update"); // Updating a client by adding a contact

  const parsed = insertContactSchema.parse(data);

  const [contact] = await db
    .insert(clientContacts)
    .values({
      ...parsed,
      createdBy: user.userId,
      updatedBy: user.userId,
    })
    .returning({ contactId: clientContacts.contactId });

  await logActivity(
    user.organizationId,
    user.userId,
    "create",
    parsed.clientId, // Log against the client
    "client_contact",
    `Added contact ${parsed.name}`,
    { ...parsed, contactId: contact.contactId }
  );

  revalidatePath(`/clients/${parsed.clientId}`);
  return contact;
}

/**
 * Updates an existing contact profile.
 * Logs the activity against the parent client's feed.
 * Requires `clients.update` permission on the parent client.
 */
export async function updateContact(
  contactId: string,
  clientId: string,
  data: z.infer<typeof updateContactSchema>
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "clients", "update");

  const parsed = updateContactSchema.parse(data);

  const [contact] = await db
    .update(clientContacts)
    .set({
      ...parsed,
      updatedBy: user.userId,
      updatedAt: new Date(),
    })
    .where(eq(clientContacts.contactId, contactId))
    .returning({ contactId: clientContacts.contactId, name: clientContacts.name });

  if (!contact) throw new Error("Contact not found");

  await logActivity(
    user.organizationId,
    user.userId,
    "update",
    clientId, // Log against the client
    "client_contact",
    `Updated contact ${contact.name}`,
    { ...parsed, contactId: contact.contactId }
  );

  revalidatePath(`/clients/${clientId}`);
  return contact;
}

/**
 * Soft-deletes (archives) a specific contact.
 * Logs the activity against the parent client's feed.
 * Requires `clients.update` permission on the parent client.
 */
export async function archiveContact(contactId: string, clientId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "clients", "update"); // Updating a client by deleting a contact

  const [contact] = await db
    .update(clientContacts)
    .set({
      deletedAt: new Date(),
      deletedBy: user.userId,
      isArchived: true,
      status: "archived",
      updatedAt: new Date(),
      updatedBy: user.userId,
    })
    .where(eq(clientContacts.contactId, contactId))
    .returning({ contactId: clientContacts.contactId, name: clientContacts.name });

  if (!contact) throw new Error("Contact not found");

  await logActivity(
    user.organizationId,
    user.userId,
    "archive",
    clientId,
    "client_contact",
    `Archived contact ${contact.name}`,
    { contactId: contact.contactId }
  );

  revalidatePath(`/clients/${clientId}`);
  return contact;
}

export async function getClientsCount() {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "clients", "read");

  const [result] = await db
    .select({ value: count(clients.clientId) })
    .from(clients)
    .where(
      and(
        eq(clients.organizationId, user.organizationId),
        isNull(clients.deletedAt)
      )
    );

  return result?.value ?? 0;
}
