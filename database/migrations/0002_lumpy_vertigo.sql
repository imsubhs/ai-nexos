CREATE TYPE "public"."client_health" AS ENUM('good', 'at_risk', 'critical');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('active', 'prospect', 'archived');--> statement-breakpoint
CREATE TYPE "public"."preferred_communication" AS ENUM('email', 'slack', 'whatsapp', 'phone');--> statement-breakpoint
CREATE TYPE "public"."contact_type" AS ENUM('primary', 'billing', 'marketing', 'technical', 'legal');--> statement-breakpoint
CREATE TABLE "client_contacts" (
	"contact_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact_type" "contact_type" DEFAULT 'primary' NOT NULL,
	"designation" text,
	"email" text,
	"phone" text,
	"linkedin" text,
	"notes" text,
	"status" "entity_status" DEFAULT 'active' NOT NULL,
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
CREATE TABLE "clients" (
	"client_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"company_name" text NOT NULL,
	"industry" text,
	"website" text,
	"address" text,
	"country" text,
	"notes" text,
	"status" "client_status" DEFAULT 'active' NOT NULL,
	"client_health" "client_health",
	"logo_url" text,
	"brand_colors" jsonb,
	"typography" jsonb,
	"moodboards" jsonb,
	"brand_assets_url" text,
	"google_drive_folder_url" text,
	"reference_assets" jsonb,
	"preferred_communication" "preferred_communication",
	"ai_summary" text,
	"ai_health_score" text,
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
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_client_contacts_client_id" ON "client_contacts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_clients_organization_id" ON "clients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_clients_status" ON "clients" USING btree ("status");--> statement-breakpoint

-- Audit triggers
CREATE TRIGGER trg_touch_clients BEFORE UPDATE ON "clients"
  FOR EACH ROW EXECUTE FUNCTION app.touch_audit_fields();--> statement-breakpoint
CREATE TRIGGER trg_touch_client_contacts BEFORE UPDATE ON "client_contacts"
  FOR EACH ROW EXECUTE FUNCTION app.touch_audit_fields();--> statement-breakpoint

-- RLS Enablement
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "client_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- clients policies
CREATE POLICY clients_select ON "clients" FOR SELECT TO authenticated
  USING (app.is_org_member(organization_id) AND app.has_permission('clients', 'read'));--> statement-breakpoint
CREATE POLICY clients_insert ON "clients" FOR INSERT TO authenticated
  WITH CHECK (app.is_org_member(organization_id) AND app.has_permission('clients', 'create'));--> statement-breakpoint
CREATE POLICY clients_update ON "clients" FOR UPDATE TO authenticated
  USING (app.is_org_member(organization_id) AND app.has_permission('clients', 'update'))
  WITH CHECK (app.is_org_member(organization_id));--> statement-breakpoint
CREATE POLICY clients_delete ON "clients" FOR DELETE TO authenticated
  USING (app.is_org_member(organization_id) AND app.has_permission('clients', 'delete'));--> statement-breakpoint

-- client_contacts policies
CREATE POLICY client_contacts_select ON "client_contacts" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "clients" c
      WHERE c.client_id = "client_contacts".client_id
      AND app.is_org_member(c.organization_id)
    )
    AND app.has_permission('clients', 'read')
  );--> statement-breakpoint
CREATE POLICY client_contacts_insert ON "client_contacts" FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "clients" c
      WHERE c.client_id = "client_contacts".client_id
      AND app.is_org_member(c.organization_id)
    )
    AND app.has_permission('clients', 'create')
  );--> statement-breakpoint
CREATE POLICY client_contacts_update ON "client_contacts" FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "clients" c
      WHERE c.client_id = "client_contacts".client_id
      AND app.is_org_member(c.organization_id)
    )
    AND app.has_permission('clients', 'update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "clients" c
      WHERE c.client_id = "client_contacts".client_id
      AND app.is_org_member(c.organization_id)
    )
  );--> statement-breakpoint
CREATE POLICY client_contacts_delete ON "client_contacts" FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "clients" c
      WHERE c.client_id = "client_contacts".client_id
      AND app.is_org_member(c.organization_id)
    )
    AND app.has_permission('clients', 'delete')
  );--> statement-breakpoint

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE "clients";--> statement-breakpoint
ALTER PUBLICATION supabase_realtime ADD TABLE "client_contacts";