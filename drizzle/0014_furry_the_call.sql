CREATE TABLE "brain_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requested_by_admin_user_id" uuid,
	"request_type" text NOT NULL,
	"request_source" text NOT NULL,
	"related_entity_type" text,
	"related_entity_id" text,
	"prompt_summary" text NOT NULL,
	"response_summary" text,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"status" text NOT NULL,
	"usage_metadata" jsonb,
	"error_category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brain_requests" ADD CONSTRAINT "brain_requests_requested_by_admin_user_id_admin_users_id_fk" FOREIGN KEY ("requested_by_admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brain_requests_created_at_idx" ON "brain_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "brain_requests_requested_by_admin_user_id_idx" ON "brain_requests" USING btree ("requested_by_admin_user_id");--> statement-breakpoint
CREATE INDEX "brain_requests_related_entity_idx" ON "brain_requests" USING btree ("related_entity_type","related_entity_id");