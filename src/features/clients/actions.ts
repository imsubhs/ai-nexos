"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";

export async function getClients(...args: Parameters<typeof real.getClients>): Promise<Awaited<ReturnType<typeof real.getClients>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getClients(...args);
  return (real as any).getClients(...args);
}

export async function getClientById(...args: Parameters<typeof real.getClientById>): Promise<Awaited<ReturnType<typeof real.getClientById>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getClientById(...args);
  return (real as any).getClientById(...args);
}

export async function getClientActivity(...args: Parameters<typeof real.getClientActivity>): Promise<Awaited<ReturnType<typeof real.getClientActivity>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getClientActivity(...args);
  return (real as any).getClientActivity(...args);
}

export async function createClient(...args: Parameters<typeof real.createClient>): Promise<Awaited<ReturnType<typeof real.createClient>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).createClient(...args);
  return (real as any).createClient(...args);
}

export async function updateClient(...args: Parameters<typeof real.updateClient>): Promise<Awaited<ReturnType<typeof real.updateClient>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).updateClient(...args);
  return (real as any).updateClient(...args);
}

export async function archiveClient(...args: Parameters<typeof real.archiveClient>): Promise<Awaited<ReturnType<typeof real.archiveClient>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).archiveClient(...args);
  return (real as any).archiveClient(...args);
}

export async function createContact(...args: Parameters<typeof real.createContact>): Promise<Awaited<ReturnType<typeof real.createContact>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).createContact(...args);
  return (real as any).createContact(...args);
}

export async function updateContact(...args: Parameters<typeof real.updateContact>): Promise<Awaited<ReturnType<typeof real.updateContact>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).updateContact(...args);
  return (real as any).updateContact(...args);
}

export async function archiveContact(...args: Parameters<typeof real.archiveContact>): Promise<Awaited<ReturnType<typeof real.archiveContact>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).archiveContact(...args);
  return (real as any).archiveContact(...args);
}

export async function getClientsCount(...args: Parameters<typeof real.getClientsCount>): Promise<Awaited<ReturnType<typeof real.getClientsCount>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getClientsCount(...args);
  return (real as any).getClientsCount(...args);
}

