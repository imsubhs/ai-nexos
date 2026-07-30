CREATE TYPE "public"."correction_status" AS ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."correction_type" AS ENUM('LOGIN_TIME', 'LOGOUT_TIME', 'BOTH', 'STATUS_CHANGE', 'OTHER');--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'correction';--> statement-breakpoint
CREATE TABLE "attendance_corrections" (
	"correction_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"correction_code" text NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"correction_type" "correction_type" NOT NULL,
	"requested_clock_in_at" timestamp with time zone,
	"requested_clock_out_at" timestamp with time zone,
	"requested_status" "attendance_status",
	"reason" text NOT NULL,
	"evidence_url" text,
	"status" "correction_status" DEFAULT 'PENDING' NOT NULL,
	"approval_cycle_id" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"applied_at" timestamp with time zone,
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
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_approval_cycle_id_approval_cycles_cycle_id_fk" FOREIGN KEY ("approval_cycle_id") REFERENCES "public"."approval_cycles"("cycle_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_reviewed_by_users_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_correction_org_code" ON "attendance_corrections" USING btree ("organization_id","correction_code");--> statement-breakpoint
CREATE INDEX "idx_correction_org" ON "attendance_corrections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_correction_user" ON "attendance_corrections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_correction_org_status" ON "attendance_corrections" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_correction_org_user_date" ON "attendance_corrections" USING btree ("organization_id","user_id","date");