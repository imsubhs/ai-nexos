CREATE TYPE "public"."project_health" AS ENUM('on_track', 'at_risk', 'delayed', 'blocked', 'completed');--> statement-breakpoint
CREATE TYPE "public"."project_priority" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('planning', 'research', 'brief_received', 'in_progress', 'internal_review', 'client_review', 'revision', 'approved', 'completed', 'on_hold', 'cancelled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."project_visibility" AS ENUM('private', 'internal', 'client_shared');--> statement-breakpoint
CREATE TABLE "project_members" (
	"member_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"project_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid,
	"project_name" text NOT NULL,
	"project_code" text NOT NULL,
	"description" text,
	"project_manager" uuid,
	"creative_director" uuid,
	"department_id" uuid,
	"priority" "project_priority" DEFAULT 'medium' NOT NULL,
	"status" "project_status" DEFAULT 'planning' NOT NULL,
	"start_date" timestamp with time zone,
	"estimated_end_date" timestamp with time zone,
	"actual_end_date" timestamp with time zone,
	"completion_percentage" integer DEFAULT 0 NOT NULL,
	"budget" numeric(12, 2),
	"health_status" "project_health" DEFAULT 'on_track' NOT NULL,
	"visibility" "project_visibility" DEFAULT 'internal' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
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
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_project_manager_users_user_id_fk" FOREIGN KEY ("project_manager") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_creative_director_users_user_id_fk" FOREIGN KEY ("creative_director") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_department_id_departments_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("department_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_project_members_project_id" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_project_members_user_id" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_projects_organization_id" ON "projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_projects_client_id" ON "projects" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_projects_status" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_projects_code" ON "projects" USING btree ("organization_id","project_code");--> statement-breakpoint

-- Audit triggers
CREATE TRIGGER trg_touch_projects BEFORE UPDATE ON "projects"
  FOR EACH ROW EXECUTE FUNCTION app.touch_audit_fields();--> statement-breakpoint

-- RLS Enablement
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- projects policies
CREATE POLICY projects_select ON "projects" FOR SELECT TO authenticated
  USING (app.is_org_member(organization_id) AND app.has_permission('projects', 'read'));--> statement-breakpoint
CREATE POLICY projects_insert ON "projects" FOR INSERT TO authenticated
  WITH CHECK (app.is_org_member(organization_id) AND app.has_permission('projects', 'create'));--> statement-breakpoint
CREATE POLICY projects_update ON "projects" FOR UPDATE TO authenticated
  USING (app.is_org_member(organization_id) AND app.has_permission('projects', 'update'))
  WITH CHECK (app.is_org_member(organization_id));--> statement-breakpoint
CREATE POLICY projects_delete ON "projects" FOR DELETE TO authenticated
  USING (app.is_org_member(organization_id) AND app.has_permission('projects', 'delete'));--> statement-breakpoint

-- project_members policies
CREATE POLICY project_members_select ON "project_members" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "projects" p
      WHERE p.project_id = "project_members".project_id
      AND app.is_org_member(p.organization_id)
    )
    AND app.has_permission('projects', 'read')
  );--> statement-breakpoint
CREATE POLICY project_members_insert ON "project_members" FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "projects" p
      WHERE p.project_id = "project_members".project_id
      AND app.is_org_member(p.organization_id)
    )
    AND app.has_permission('projects', 'update')
  );--> statement-breakpoint
CREATE POLICY project_members_update ON "project_members" FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "projects" p
      WHERE p.project_id = "project_members".project_id
      AND app.is_org_member(p.organization_id)
    )
    AND app.has_permission('projects', 'update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "projects" p
      WHERE p.project_id = "project_members".project_id
      AND app.is_org_member(p.organization_id)
    )
  );--> statement-breakpoint
CREATE POLICY project_members_delete ON "project_members" FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "projects" p
      WHERE p.project_id = "project_members".project_id
      AND app.is_org_member(p.organization_id)
    )
    AND app.has_permission('projects', 'update')
  );--> statement-breakpoint

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE "projects";--> statement-breakpoint
ALTER PUBLICATION supabase_realtime ADD TABLE "project_members";