CREATE TABLE "ai_generation_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"requested_by_admin_user_id" uuid,
	"task_preset" text NOT NULL,
	"context_source_type" text,
	"context_source_id" text,
	"brief" jsonb NOT NULL,
	"reference_media_asset_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"requested_size" text NOT NULL,
	"requested_quality" text NOT NULL,
	"status" text NOT NULL,
	"error_category" text,
	"output_storage_key" text,
	"output_url" text,
	"output_width" integer,
	"output_height" integer,
	"output_size_bytes" integer,
	"output_media_asset_id" text,
	"usage_metadata" jsonb,
	"discarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"saved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "ai_generation_jobs" ADD CONSTRAINT "ai_generation_jobs_requested_by_admin_user_id_admin_users_id_fk" FOREIGN KEY ("requested_by_admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generation_jobs" ADD CONSTRAINT "ai_generation_jobs_output_media_asset_id_media_assets_id_fk" FOREIGN KEY ("output_media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_generation_jobs_created_at_idx" ON "ai_generation_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_generation_jobs_requested_by_admin_user_id_idx" ON "ai_generation_jobs" USING btree ("requested_by_admin_user_id");--> statement-breakpoint
CREATE INDEX "ai_generation_jobs_output_media_asset_id_idx" ON "ai_generation_jobs" USING btree ("output_media_asset_id");