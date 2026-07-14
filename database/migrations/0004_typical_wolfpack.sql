CREATE TABLE "organization_sequences" (
	"organization_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"next_value" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_sequences" ADD CONSTRAINT "organization_sequences_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_org_seq_entity" ON "organization_sequences" USING btree ("organization_id","entity_type");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_project_members_proj_user" ON "project_members" USING btree ("project_id","user_id");--> statement-breakpoint
DROP POLICY IF EXISTS "projects_select" ON "projects";
--> statement-breakpoint
CREATE POLICY projects_select ON "projects" FOR SELECT TO authenticated
  USING (
    app.is_org_member(organization_id) 
    AND app.has_permission('projects', 'read')
    AND (
      visibility != 'private' 
      OR app.has_permission('projects', '*')
      OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.project_id AND pm.user_id = auth.uid())
    )
  );
