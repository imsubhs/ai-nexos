// @vitest-environment node

/**
 * Regression Test Suite for NEXOS-SEC-01:
 * Cross-Tenant Client Contact IDOR & Object-Level Authorization Gate
 *
 * Invariant Under Test:
 * An authenticated user may mutate a client contact only when:
 * 1. The user has the required permission (clients.update);
 * 2. The contact exists;
 * 3. The contact's parent client exists;
 * 4. The parent client belongs to the user's server-derived active organization;
 * 5. All authorization decisions are strictly enforced server-side.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { CurrentUser } from "@/features/auth/current-user";
import { SYSTEM_ROLES } from "@/features/permissions/constants";
import { PermissionDeniedError } from "@/features/permissions";
import { extractParams } from "./helpers/recording-db";

const ORG_A = "00000000-0000-4000-8000-00000000000a";
const ORG_B = "00000000-0000-4000-8000-00000000000b";

const CLIENT_A_ID = "00000000-0000-4000-8000-000000000101";
const CLIENT_B_ID = "00000000-0000-4000-8000-000000000201";

const CONTACT_A_ID = "00000000-0000-4000-8000-000000000102";
const CONTACT_B_ID = "00000000-0000-4000-8000-000000000202";

type MockClient = {
  clientId: string;
  organizationId: string;
  companyName: string;
  deletedAt: Date | null;
};

type MockContact = {
  contactId: string;
  clientId: string;
  name: string;
  contactType: "primary" | "billing" | "marketing" | "technical" | "legal";
  designation: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  notes: string | null;
  status: "active" | "inactive" | "archived";
  deletedAt: Date | null;
  isArchived: boolean;
};

const state = vi.hoisted(() => {
  return {
    clients: [] as MockClient[],
    contacts: [] as MockContact[],
    activityLogs: [] as Record<string, unknown>[],
    currentUser: null as CurrentUser | null,
    recordedQueries: [] as { table?: string; params: string[] }[],
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/features/auth/current-user", () => ({
  requireCurrentUser: async () => {
    if (!state.currentUser) {
      throw new Error("Authentication required: no active session");
    }
    return state.currentUser;
  },
  getCurrentUser: async () => state.currentUser,
}));

vi.mock("@/db", () => {
  return {
    db: {
      select: () => {
        let isClientsTable = false;
        let isClientContactsTable = false;
        let whereCondition: unknown = null;
        let isJoinWithClients = false;

        const chain: any = {
          from: (table: any) => {
            if (table && "contactId" in table) {
              isClientContactsTable = true;
            } else if (table && "clientId" in table) {
              isClientsTable = true;
            }
            return chain;
          },
          innerJoin: (table: any) => {
            if (table && "clientId" in table && !("contactId" in table)) {
              isJoinWithClients = true;
            }
            return chain;
          },
          where: (cond: unknown) => {
            whereCondition = cond;
            return chain;
          },
          limit: () => chain,
          then: (resolve: (val: any) => any) => {
            const params = extractParams(whereCondition);
            state.recordedQueries.push({
              table: isClientContactsTable
                ? "client_contacts"
                : isClientsTable
                  ? "clients"
                  : "unknown",
              params,
            });

            // 1. SELECT from clients: createContact parent check
            if (
              isClientsTable &&
              !isJoinWithClients &&
              !isClientContactsTable
            ) {
              const [targetClientId, targetOrgId] = params;
              const found = state.clients.find(
                (c) =>
                  c.clientId === targetClientId &&
                  c.organizationId === targetOrgId &&
                  c.deletedAt === null,
              );
              resolve(found ? [{ clientId: found.clientId }] : []);
              return;
            }

            // 2. SELECT from client_contacts joined with clients: update/archive check
            if (isClientContactsTable || isJoinWithClients) {
              const [targetContactId, targetClientId, targetOrgId] = params;
              const contact = state.contacts.find(
                (ct) =>
                  ct.contactId === targetContactId &&
                  ct.clientId === targetClientId &&
                  ct.deletedAt === null,
              );
              if (!contact) {
                resolve([]);
                return;
              }
              const client = state.clients.find(
                (c) =>
                  c.clientId === contact.clientId &&
                  c.organizationId === targetOrgId &&
                  c.deletedAt === null,
              );
              if (!client) {
                resolve([]);
                return;
              }
              resolve([
                { contactId: contact.contactId, clientId: contact.clientId },
              ]);
              return;
            }

            resolve([]);
          },
        };
        return chain;
      },

      insert: (table: any) => {
        const isClientContacts = table && "contactId" in table;
        const isActivityLogs = table && "module" in table;
        let insertedValues: any = null;

        const chain: any = {
          values: (val: any) => {
            insertedValues = val;
            return chain;
          },
          returning: async () => {
            if (isClientContacts) {
              const newContactId = randomUUID();
              const newContact: MockContact = {
                contactId: newContactId,
                clientId: insertedValues.clientId,
                name: insertedValues.name,
                contactType: insertedValues.contactType ?? "primary",
                designation: insertedValues.designation ?? null,
                email: insertedValues.email ?? null,
                phone: insertedValues.phone ?? null,
                linkedin: insertedValues.linkedin ?? null,
                notes: insertedValues.notes ?? null,
                status: insertedValues.status ?? "active",
                deletedAt: null,
                isArchived: false,
              };
              state.contacts.push(newContact);
              return [{ contactId: newContactId }];
            }

            if (isActivityLogs) {
              state.activityLogs.push(insertedValues);
              return [{ id: randomUUID() }];
            }

            return [];
          },
          then: (resolve: (val: any) => any) => {
            if (isActivityLogs) {
              state.activityLogs.push(insertedValues);
            }
            resolve([]);
          },
        };
        return chain;
      },

      update: (table: any) => {
        const isClientContacts = table && "contactId" in table;
        let updateValues: any = null;
        let whereCondition: unknown = null;

        const chain: any = {
          set: (val: any) => {
            updateValues = val;
            return chain;
          },
          where: (cond: unknown) => {
            whereCondition = cond;
            return chain;
          },
          returning: async () => {
            if (isClientContacts) {
              const params = extractParams(whereCondition);
              const [targetContactId, targetClientId] = params;
              const contact = state.contacts.find(
                (ct) =>
                  ct.contactId === targetContactId &&
                  ct.clientId === targetClientId &&
                  ct.deletedAt === null,
              );
              if (!contact) return [];

              Object.assign(contact, updateValues);
              return [
                {
                  contactId: contact.contactId,
                  name: contact.name,
                },
              ];
            }
            return [];
          },
        };
        return chain;
      },
    },
  };
});

function permissionsFor(roleKey: string) {
  const role = SYSTEM_ROLES.find((r) => r.roleKey === roleKey);
  if (!role) throw new Error(`Unknown system role: ${roleKey}`);
  return role.permissions;
}

function setSession(organizationId: string, roleKey = "owner"): CurrentUser {
  const user: CurrentUser = {
    userId: randomUUID(),
    organizationId,
    email: `${roleKey}@${organizationId.slice(0, 8)}.test`,
    firstName: "Test",
    lastName: "User",
    avatarUrl: null,
    designation: null,
    roleId: randomUUID(),
    roleKey,
    roleName: roleKey,
    permissions: permissionsFor(roleKey),
    departmentId: null,
    organizationName: `Org ${organizationId.slice(0, 8)}`,
    organizationSlug: `org-${organizationId.slice(0, 8)}`,
    organizationLogoUrl: null,
    organizationTimezone: "UTC",
  };
  state.currentUser = user;
  return user;
}

function resetTestDatabase() {
  state.clients = [
    {
      clientId: CLIENT_A_ID,
      organizationId: ORG_A,
      companyName: "Acme Corporation (Tenant A)",
      deletedAt: null,
    },
    {
      clientId: CLIENT_B_ID,
      organizationId: ORG_B,
      companyName: "Globex Industries (Tenant B)",
      deletedAt: null,
    },
  ];

  state.contacts = [
    {
      contactId: CONTACT_A_ID,
      clientId: CLIENT_A_ID,
      name: "Alice A (Tenant A Contact)",
      contactType: "primary",
      designation: "VP Engineering",
      email: "alice@acme.test",
      phone: "+1-555-0101",
      linkedin: null,
      notes: "Primary account contact",
      status: "active",
      deletedAt: null,
      isArchived: false,
    },
    {
      contactId: CONTACT_B_ID,
      clientId: CLIENT_B_ID,
      name: "Bob B (Tenant B Contact)",
      contactType: "primary",
      designation: "Director of Product",
      email: "bob@globex.test",
      phone: "+1-555-0202",
      linkedin: null,
      notes: "Tenant B primary contact",
      status: "active",
      deletedAt: null,
      isArchived: false,
    },
  ];

  state.activityLogs = [];
  state.recordedQueries = [];
}

const { createContact, updateContact, archiveContact } =
  await import("@/features/clients/real-actions");

describe("NEXOS-SEC-01: Cross-Tenant Client Contact Mutation Regression Suite", () => {
  beforeEach(() => {
    resetTestDatabase();
    setSession(ORG_A, "owner");
  });

  // --------------------------------------------------------------------------
  // TEST 1: Organization A user creates contact for Organization A client
  // --------------------------------------------------------------------------
  it("TEST 1: Organization A user creates contact for Organization A client -> SUCCESS", async () => {
    const userA = setSession(ORG_A, "owner");

    const result = await createContact({
      clientId: CLIENT_A_ID,
      name: "Charlie Org A",
      email: "charlie@acme.test",
      contactType: "technical",
      status: "active",
    });

    expect(result).toBeDefined();
    expect(result.contactId).toBeDefined();

    // Verify contact was inserted and bound to Client A
    const created = state.contacts.find(
      (c) => c.contactId === result.contactId,
    );
    expect(created).toBeDefined();
    expect(created?.name).toBe("Charlie Org A");
    expect(created?.clientId).toBe(CLIENT_A_ID);

    // Verify query bound user's organizationId
    const query = state.recordedQueries.find((q) => q.table === "clients");
    expect(query?.params).toContain(userA.organizationId);
    expect(query?.params).toContain(CLIENT_A_ID);
  });

  // --------------------------------------------------------------------------
  // TEST 2: Organization A user attempts createContact using Organization B clientId
  // --------------------------------------------------------------------------
  it("TEST 2: Organization A user attempts createContact using Organization B clientId -> DENIED", async () => {
    setSession(ORG_A, "owner");

    await expect(
      createContact({
        clientId: CLIENT_B_ID, // Foreign tenant client
        name: "Infiltrator",
        email: "spy@globex.test",
        contactType: "billing",
        status: "active",
      }),
    ).rejects.toThrow("Client not found");

    // Ensure no contact was added under Client B
    const rogue = state.contacts.find((c) => c.name === "Infiltrator");
    expect(rogue).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // TEST 3: Organization A user updates Organization A contact
  // --------------------------------------------------------------------------
  it("TEST 3: Organization A user updates Organization A contact -> SUCCESS", async () => {
    setSession(ORG_A, "owner");

    const result = await updateContact(CONTACT_A_ID, CLIENT_A_ID, {
      name: "Alice A Updated",
      designation: "Chief Technology Officer",
    });

    expect(result).toBeDefined();
    expect(result.contactId).toBe(CONTACT_A_ID);
    expect(result.name).toBe("Alice A Updated");

    const updated = state.contacts.find((c) => c.contactId === CONTACT_A_ID);
    expect(updated?.name).toBe("Alice A Updated");
    expect(updated?.designation).toBe("Chief Technology Officer");
  });

  // --------------------------------------------------------------------------
  // TEST 4: Organization A user updates Organization B contact
  // --------------------------------------------------------------------------
  it("TEST 4: Organization A user updates Organization B contact -> DENIED", async () => {
    setSession(ORG_A, "owner");

    await expect(
      updateContact(CONTACT_B_ID, CLIENT_B_ID, {
        name: "Tampered Name",
      }),
    ).rejects.toThrow("Contact not found");

    // Ensure Tenant B contact was NOT modified
    const original = state.contacts.find((c) => c.contactId === CONTACT_B_ID);
    expect(original?.name).toBe("Bob B (Tenant B Contact)");
  });

  // --------------------------------------------------------------------------
  // TEST 5: Organization A user archives Organization A contact
  // --------------------------------------------------------------------------
  it("TEST 5: Organization A user archives Organization A contact -> SUCCESS", async () => {
    setSession(ORG_A, "owner");

    const result = await archiveContact(CONTACT_A_ID, CLIENT_A_ID);

    expect(result).toBeDefined();
    expect(result.contactId).toBe(CONTACT_A_ID);

    const archived = state.contacts.find((c) => c.contactId === CONTACT_A_ID);
    expect(archived?.isArchived).toBe(true);
    expect(archived?.status).toBe("archived");
    expect(archived?.deletedAt).not.toBeNull();
  });

  // --------------------------------------------------------------------------
  // TEST 6: Organization A user archives Organization B contact
  // --------------------------------------------------------------------------
  it("TEST 6: Organization A user archives Organization B contact -> DENIED", async () => {
    setSession(ORG_A, "owner");

    await expect(archiveContact(CONTACT_B_ID, CLIENT_B_ID)).rejects.toThrow(
      "Contact not found",
    );

    // Verify Tenant B contact was NOT archived
    const intact = state.contacts.find((c) => c.contactId === CONTACT_B_ID);
    expect(intact?.isArchived).toBe(false);
    expect(intact?.deletedAt).toBeNull();
  });

  // --------------------------------------------------------------------------
  // TEST 7: Tampered organizationId is supplied
  // --------------------------------------------------------------------------
  it("TEST 7: Tampered organizationId is supplied -> Ignored / rejected", async () => {
    setSession(ORG_A, "owner");

    // Attacker passes foreign organizationId inside input payload to attempt cross-tenant injection
    await expect(
      createContact({
        clientId: CLIENT_B_ID,
        name: "Spoofed Org Contact",
        ...({ organizationId: ORG_B } as any),
      }),
    ).rejects.toThrow("Client not found");

    // Attacker passes their own organizationId claiming a foreign client
    await expect(
      createContact({
        clientId: CLIENT_B_ID,
        name: "Spoofed Client Contact",
        ...({ organizationId: ORG_A } as any),
      }),
    ).rejects.toThrow("Client not found");
  });

  // --------------------------------------------------------------------------
  // TEST 8: User without clients.update permission attempts mutation
  // --------------------------------------------------------------------------
  it("TEST 8: User without clients.update permission attempts mutation -> DENIED", async () => {
    // finance role has read-only or no clients.update permission
    setSession(ORG_A, "finance");

    await expect(
      createContact({
        clientId: CLIENT_A_ID,
        name: "Unauthorized Creator",
        contactType: "primary",
        status: "active",
      }),
    ).rejects.toThrow(PermissionDeniedError);

    await expect(
      updateContact(CONTACT_A_ID, CLIENT_A_ID, {
        name: "Unauthorized Updater",
      }),
    ).rejects.toThrow(PermissionDeniedError);

    await expect(archiveContact(CONTACT_A_ID, CLIENT_A_ID)).rejects.toThrow(
      PermissionDeniedError,
    );
  });

  // --------------------------------------------------------------------------
  // TEST 9: Unauthenticated request attempts mutation
  // --------------------------------------------------------------------------
  it("TEST 9: Unauthenticated request attempts mutation -> DENIED", async () => {
    state.currentUser = null;

    await expect(
      createContact({
        clientId: CLIENT_A_ID,
        name: "Anonymous User",
        contactType: "primary",
        status: "active",
      }),
    ).rejects.toThrow(/Authentication required/);

    await expect(
      updateContact(CONTACT_A_ID, CLIENT_A_ID, {
        name: "Anonymous User",
      }),
    ).rejects.toThrow(/Authentication required/);

    await expect(archiveContact(CONTACT_A_ID, CLIENT_A_ID)).rejects.toThrow(
      /Authentication required/,
    );
  });

  // --------------------------------------------------------------------------
  // TEST 10: Existing same-tenant contact workflow remains unchanged
  // --------------------------------------------------------------------------
  it("TEST 10: Existing same-tenant contact workflow remains unchanged -> PASS", async () => {
    setSession(ORG_A, "owner");

    // Step 1: Create contact in Tenant A
    const created = await createContact({
      clientId: CLIENT_A_ID,
      name: "David Dev",
      email: "david@acme.test",
      contactType: "primary",
      status: "active",
      phone: "+1-555-0999",
    });
    expect(created.contactId).toBeDefined();

    // Step 2: Update the newly created contact
    const updated = await updateContact(created.contactId, CLIENT_A_ID, {
      name: "David Senior Dev",
      designation: "Staff Architect",
    });
    expect(updated.name).toBe("David Senior Dev");

    // Step 3: Archive the contact
    const archived = await archiveContact(created.contactId, CLIENT_A_ID);
    expect(archived.contactId).toBe(created.contactId);

    // Step 4: Subsequent update on archived contact must fail
    await expect(
      updateContact(created.contactId, CLIENT_A_ID, {
        name: "Post Archive Update",
      }),
    ).rejects.toThrow("Contact not found");
  });
});
