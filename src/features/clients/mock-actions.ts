/**
 * DEMO_MODE implementation backed by the in-memory demo store.
 * Mirrors real-actions.ts behavior (filtering, ordering, soft deletes,
 * activity logging) so the demo session behaves like a real database.
 */
import { revalidatePath } from "next/cache";
import {
  DEMO_ORG_ID,
  DEMO_USER_ID,
  getDemoStore,
  logDemoActivity,
  nextDemoId,
} from "@/lib/demo/store";
import type {
  getClients as real_getClients,
  getClientById as real_getClientById,
  getClientActivity as real_getClientActivity,
  createClient as real_createClient,
  updateClient as real_updateClient,
  archiveClient as real_archiveClient,
  createContact as real_createContact,
  updateContact as real_updateContact,
  archiveContact as real_archiveContact,
  getClientsCount as real_getClientsCount,
} from "./real-actions";

export async function getClients(
  ...args: Parameters<typeof real_getClients>
): Promise<Awaited<ReturnType<typeof real_getClients>>> {
  const [query] = args;
  const store = getDemoStore();

  return store.clients
    .filter((c) => c.deletedAt === null)
    .filter((c) =>
      query ? c.companyName.toLowerCase().includes(query.toLowerCase()) : true,
    )
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) as any;
}

export async function getClientById(
  ...args: Parameters<typeof real_getClientById>
): Promise<Awaited<ReturnType<typeof real_getClientById>>> {
  const [clientId] = args;
  const store = getDemoStore();

  const client = store.clients.find(
    (c) => c.clientId === clientId && c.deletedAt === null,
  );
  if (!client) return null as any;

  return {
    ...client,
    contacts: store.clientContacts.filter(
      (ct) => ct.clientId === clientId && ct.deletedAt === null,
    ),
  } as any;
}

export async function getClientActivity(
  ...args: Parameters<typeof real_getClientActivity>
): Promise<Awaited<ReturnType<typeof real_getClientActivity>>> {
  const [clientId] = args;
  const store = getDemoStore();

  return store.activityLogs
    .filter(
      (log) =>
        log.entityId === clientId &&
        ["client", "client_contact"].includes(log.entityType),
    )
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) as any;
}

export async function createClient(
  ...args: Parameters<typeof real_createClient>
): Promise<Awaited<ReturnType<typeof real_createClient>>> {
  const [data] = args;
  const store = getDemoStore();

  const client = {
    clientId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    clientHealth: null,
    industry: null,
    website: null,
    address: null,
    country: null,
    notes: null,
    logoUrl: null,
    brandColors: null,
    preferredCommunication: null,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
  };
  store.clients.push(client);

  logDemoActivity(
    store,
    "clients",
    "create",
    "client",
    client.clientId,
    `Created client ${client.companyName}`,
    data as Record<string, unknown>,
  );

  revalidatePath("/clients");
  return { clientId: client.clientId } as any;
}

export async function updateClient(
  ...args: Parameters<typeof real_updateClient>
): Promise<Awaited<ReturnType<typeof real_updateClient>>> {
  const [clientId, data] = args;
  const store = getDemoStore();

  const client = store.clients.find(
    (c) => c.clientId === clientId && c.deletedAt === null,
  );
  if (!client) throw new Error("Client not found");

  Object.assign(client, data, {
    updatedAt: new Date(),
    updatedBy: DEMO_USER_ID,
  });

  logDemoActivity(
    store,
    "clients",
    "update",
    "client",
    clientId,
    `Updated client ${client.companyName}`,
    data as Record<string, unknown>,
  );

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return { clientId, companyName: client.companyName } as any;
}

export async function archiveClient(
  ...args: Parameters<typeof real_archiveClient>
): Promise<Awaited<ReturnType<typeof real_archiveClient>>> {
  const [clientId] = args;
  const store = getDemoStore();

  const client = store.clients.find(
    (c) => c.clientId === clientId && c.deletedAt === null,
  );
  if (!client) throw new Error("Client not found");

  const now = new Date();
  Object.assign(client, {
    deletedAt: now,
    deletedBy: DEMO_USER_ID,
    isArchived: true,
    status: "archived",
    updatedAt: now,
    updatedBy: DEMO_USER_ID,
  });

  store.clientContacts
    .filter((ct) => ct.clientId === clientId && ct.deletedAt === null)
    .forEach((ct) =>
      Object.assign(ct, {
        deletedAt: now,
        deletedBy: DEMO_USER_ID,
        isArchived: true,
        status: "archived",
        updatedAt: now,
        updatedBy: DEMO_USER_ID,
      }),
    );

  logDemoActivity(
    store,
    "clients",
    "archive",
    "client",
    clientId,
    `Archived client ${client.companyName}`,
  );

  revalidatePath("/clients");
  return { clientId, companyName: client.companyName } as any;
}

export async function createContact(
  ...args: Parameters<typeof real_createContact>
): Promise<Awaited<ReturnType<typeof real_createContact>>> {
  const [data] = args;
  const store = getDemoStore();

  const contact = {
    contactId: nextDemoId(store),
    designation: null,
    email: null,
    phone: null,
    linkedin: null,
    notes: null,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
  };
  store.clientContacts.push(contact);

  logDemoActivity(
    store,
    "clients",
    "create",
    "client_contact",
    data.clientId,
    `Added contact ${contact.name}`,
    {
      ...data,
      contactId: contact.contactId,
    },
  );

  revalidatePath(`/clients/${data.clientId}`);
  return { contactId: contact.contactId } as any;
}

export async function updateContact(
  ...args: Parameters<typeof real_updateContact>
): Promise<Awaited<ReturnType<typeof real_updateContact>>> {
  const [contactId, clientId, data] = args;
  const store = getDemoStore();

  const contact = store.clientContacts.find((ct) => ct.contactId === contactId);
  if (!contact) throw new Error("Contact not found");

  Object.assign(contact, data, {
    updatedAt: new Date(),
    updatedBy: DEMO_USER_ID,
  });

  logDemoActivity(
    store,
    "clients",
    "update",
    "client_contact",
    clientId,
    `Updated contact ${contact.name}`,
    {
      ...data,
      contactId,
    },
  );

  revalidatePath(`/clients/${clientId}`);
  return { contactId, name: contact.name } as any;
}

export async function archiveContact(
  ...args: Parameters<typeof real_archiveContact>
): Promise<Awaited<ReturnType<typeof real_archiveContact>>> {
  const [contactId, clientId] = args;
  const store = getDemoStore();

  const contact = store.clientContacts.find((ct) => ct.contactId === contactId);
  if (!contact) throw new Error("Contact not found");

  const now = new Date();
  Object.assign(contact, {
    deletedAt: now,
    deletedBy: DEMO_USER_ID,
    isArchived: true,
    status: "archived",
    updatedAt: now,
    updatedBy: DEMO_USER_ID,
  });

  logDemoActivity(
    store,
    "clients",
    "archive",
    "client_contact",
    clientId,
    `Archived contact ${contact.name}`,
    { contactId },
  );

  revalidatePath(`/clients/${clientId}`);
  return { contactId, name: contact.name } as any;
}

export async function getClientsCount(
  ...args: Parameters<typeof real_getClientsCount>
): Promise<Awaited<ReturnType<typeof real_getClientsCount>>> {
  const store = getDemoStore();
  return store.clients.filter((c) => c.deletedAt === null).length as any;
}
