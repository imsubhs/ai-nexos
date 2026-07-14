CREATE TYPE "public"."dependency_type" AS ENUM('FS', 'SS', 'FF', 'SF');--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('not_started', 'in_progress', 'blocked', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."project_phase_name" AS ENUM('planning', 'pre_production', 'production', 'post_production', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."timeline_status" AS ENUM('planning', 'research', 'ready', 'in_progress', 'blocked', 'review', 'client_review', 'revision', 'approved', 'completed', 'cancelled', 'archived');--> statement-breakpoint
CREATE TABLE "milestones" (
	"milestone_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"timeline_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "milestone_status" DEFAULT 'not_started' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_phases" (
	"phase_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timeline_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" "project_phase_name" NOT NULL,
	"order_index" integer NOT NULL,
	"status" "milestone_status" DEFAULT 'not_started' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_dependencies" (
	"dependency_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timeline_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"predecessor_id" uuid NOT NULL,
	"successor_id" uuid NOT NULL,
	"dependency_type" "dependency_type" DEFAULT 'FS' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "timeline_versions" (
	"version_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timeline_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"user_id" uuid,
	"change_summary" text NOT NULL,
	"reason" text,
	"snapshot_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timelines" (
	"timeline_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"status" timeline_status DEFAULT 'planning' NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"overall_progress" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_phase_id_project_phases_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."project_phases"("phase_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_timeline_id_timelines_timeline_id_fk" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("timeline_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_timeline_id_timelines_timeline_id_fk" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("timeline_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_dependencies" ADD CONSTRAINT "timeline_dependencies_timeline_id_timelines_timeline_id_fk" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("timeline_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_dependencies" ADD CONSTRAINT "timeline_dependencies_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_dependencies" ADD CONSTRAINT "timeline_dependencies_predecessor_id_milestones_milestone_id_fk" FOREIGN KEY ("predecessor_id") REFERENCES "public"."milestones"("milestone_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_dependencies" ADD CONSTRAINT "timeline_dependencies_successor_id_milestones_milestone_id_fk" FOREIGN KEY ("successor_id") REFERENCES "public"."milestones"("milestone_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_dependencies" ADD CONSTRAINT "timeline_dependencies_created_by_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_versions" ADD CONSTRAINT "timeline_versions_timeline_id_timelines_timeline_id_fk" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("timeline_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_versions" ADD CONSTRAINT "timeline_versions_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_versions" ADD CONSTRAINT "timeline_versions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_milestones_phase" ON "milestones" USING btree ("phase_id");--> statement-breakpoint
CREATE INDEX "idx_milestones_timeline" ON "milestones" USING btree ("timeline_id");--> statement-breakpoint
CREATE INDEX "idx_project_phases_timeline" ON "project_phases" USING btree ("timeline_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_project_phases_order" ON "project_phases" USING btree ("timeline_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_timeline_deps_nodes" ON "timeline_dependencies" USING btree ("predecessor_id","successor_id");--> statement-breakpoint
CREATE INDEX "idx_timeline_deps_timeline" ON "timeline_dependencies" USING btree ("timeline_id");--> statement-breakpoint
CREATE INDEX "idx_timeline_versions_timeline" ON "timeline_versions" USING btree ("timeline_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_timeline_versions_num" ON "timeline_versions" USING btree ("timeline_id","version_number");--> statement-breakpoint
CREATE INDEX "idx_timelines_org" ON "timelines" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_timelines_project" ON "timelines" USING btree ("project_id");
--> statement-breakpoint
ALTER TABLE "timelines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY timelines_select ON "timelines" FOR SELECT TO authenticated
  USING (
    app.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.project_id = timelines.project_id 
      AND (
        p.visibility != 'private' 
        OR app.has_permission('projects', '*')
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.project_id AND pm.user_id = auth.uid())
      )
    )
  );

--> statement-breakpoint
ALTER TABLE "timeline_versions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY timeline_versions_select ON "timeline_versions" FOR SELECT TO authenticated
  USING (
    app.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1 FROM timelines t
      JOIN projects p ON t.project_id = p.project_id
      WHERE t.timeline_id = timeline_versions.timeline_id
      AND (
        p.visibility != 'private' 
        OR app.has_permission('projects', '*')
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.project_id AND pm.user_id = auth.uid())
      )
    )
  );

--> statement-breakpoint
ALTER TABLE "project_phases" ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_phases_select ON "project_phases" FOR SELECT TO authenticated
  USING (
    app.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1 FROM timelines t
      JOIN projects p ON t.project_id = p.project_id
      WHERE t.timeline_id = project_phases.timeline_id
      AND (
        p.visibility != 'private' 
        OR app.has_permission('projects', '*')
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.project_id AND pm.user_id = auth.uid())
      )
    )
  );

--> statement-breakpoint
ALTER TABLE "milestones" ENABLE ROW LEVEL SECURITY;
CREATE POLICY milestones_select ON "milestones" FOR SELECT TO authenticated
  USING (
    app.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1 FROM timelines t
      JOIN projects p ON t.project_id = p.project_id
      WHERE t.timeline_id = milestones.timeline_id
      AND (
        p.visibility != 'private' 
        OR app.has_permission('projects', '*')
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.project_id AND pm.user_id = auth.uid())
      )
    )
  );

--> statement-breakpoint
ALTER TABLE "timeline_dependencies" ENABLE ROW LEVEL SECURITY;
CREATE POLICY timeline_dependencies_select ON "timeline_dependencies" FOR SELECT TO authenticated
  USING (
    app.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1 FROM timelines t
      JOIN projects p ON t.project_id = p.project_id
      WHERE t.timeline_id = timeline_dependencies.timeline_id
      AND (
        p.visibility != 'private' 
        OR app.has_permission('projects', '*')
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.project_id AND pm.user_id = auth.uid())
      )
    )
  );
