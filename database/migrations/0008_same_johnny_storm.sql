CREATE TYPE "public"."attendance_status" AS ENUM('PRESENT', 'ABSENT', 'LATE', 'WFH', 'HALF_DAY', 'WORKING', 'LEAVE', 'HOLIDAY');--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'attendance';--> statement-breakpoint
CREATE TABLE "attendance_breaks" (
	"break_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"attendance_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"kind" text DEFAULT 'break' NOT NULL,
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
CREATE TABLE "attendance_records" (
	"attendance_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"clock_in_at" timestamp with time zone,
	"clock_out_at" timestamp with time zone,
	"status" "attendance_status" DEFAULT 'WORKING' NOT NULL,
	"is_late" boolean DEFAULT false NOT NULL,
	"working_minutes" integer DEFAULT 0 NOT NULL,
	"break_minutes" integer DEFAULT 0 NOT NULL,
	"idle_minutes" integer DEFAULT 0 NOT NULL,
	"focus_minutes" integer DEFAULT 0 NOT NULL,
	"effective_minutes" integer DEFAULT 0 NOT NULL,
	"overtime_minutes" integer DEFAULT 0 NOT NULL,
	"clock_in_context" jsonb,
	"clock_out_context" jsonb,
	"notes" text,
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
ALTER TABLE "attendance_breaks" ADD CONSTRAINT "attendance_breaks_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_breaks" ADD CONSTRAINT "attendance_breaks_attendance_id_attendance_records_attendance_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance_records"("attendance_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_attendance_breaks_attendance" ON "attendance_breaks" USING btree ("attendance_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_breaks_org" ON "attendance_breaks" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_attendance_org_user_date" ON "attendance_records" USING btree ("organization_id","user_id","date");--> statement-breakpoint
CREATE INDEX "idx_attendance_org" ON "attendance_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_org_date" ON "attendance_records" USING btree ("organization_id","date");--> statement-breakpoint
CREATE INDEX "idx_attendance_user_date" ON "attendance_records" USING btree ("user_id","date");