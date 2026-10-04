"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClientProjectList, ClientProjectItem } from "./client-project-list";
import { ClientContactsTab } from "./client-contacts-tab";
import { ClientBrandKit } from "./client-brand-kit";
import { ClientActivityFeed, ActivityItem } from "./client-activity-feed";
import { ContactData } from "./client-contact-dialog";
import { FolderKanban, Users, Palette, Activity } from "lucide-react";

interface ClientCommandTabsProps {
  clientId: string;
  client: {
    clientId: string;
    companyName: string;
    brandColors?: unknown;
    typography?: unknown;
    moodboards?: unknown;
    brandAssetsUrl?: string | null;
    googleDriveFolderUrl?: string | null;
    referenceAssets?: unknown;
  };
  projects: ClientProjectItem[];
  contacts: ContactData[];
  activities: ActivityItem[];
  canCreateProject?: boolean;
  onRefresh?: () => void;
  onEditBrandKit?: () => void;
}

export function ClientCommandTabs({
  clientId,
  client,
  projects,
  contacts,
  activities,
  canCreateProject = true,
  onRefresh,
  onEditBrandKit,
}: ClientCommandTabsProps) {
  const [activeTab, setActiveTab] = useState<string | number>("projects");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val)}>
        <div className="border-b border-border-subtle pb-3">
          <TabsList className="bg-surface-1 border border-border-subtle p-1 rounded-lg">
            <TabsTrigger value="projects" className="gap-2">
              <FolderKanban className="size-3.5" />
              <span>Engagements</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface-2 text-foreground-muted">
                {projects.length}
              </span>
            </TabsTrigger>

            <TabsTrigger value="contacts" className="gap-2">
              <Users className="size-3.5" />
              <span>Stakeholders</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface-2 text-foreground-muted">
                {contacts.length}
              </span>
            </TabsTrigger>

            <TabsTrigger value="brand-kit" className="gap-2">
              <Palette className="size-3.5" />
              <span>Brand Kit</span>
            </TabsTrigger>

            <TabsTrigger value="activity" className="gap-2">
              <Activity className="size-3.5" />
              <span>Activity</span>
              {activities.length > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface-2 text-foreground-muted">
                  {activities.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Engagements / Projects */}
        <TabsContent value="projects" className="pt-2">
          <ClientProjectList
            projects={projects}
            clientId={clientId}
            canCreateProject={canCreateProject}
          />
        </TabsContent>

        {/* Tab 2: Stakeholders Directory */}
        <TabsContent value="contacts" className="pt-2">
          <ClientContactsTab
            clientId={clientId}
            contacts={contacts}
            onRefresh={onRefresh}
          />
        </TabsContent>

        {/* Tab 3: Brand Kit & Assets */}
        <TabsContent value="brand-kit" className="pt-2">
          <ClientBrandKit client={client} onEditBrandKit={onEditBrandKit} />
        </TabsContent>

        {/* Tab 4: Communication & Activity */}
        <TabsContent value="activity" className="pt-2">
          <ClientActivityFeed activities={activities} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
