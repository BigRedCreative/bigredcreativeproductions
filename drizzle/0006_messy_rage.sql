CREATE TABLE "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"storage_provider" text NOT NULL,
	"storage_key" text NOT NULL,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"mime_type" text NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text NOT NULL,
	"width" integer,
	"height" integer,
	"size_bytes" integer NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"caption" text,
	"status" text NOT NULL,
	"created_by_admin_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_created_by_admin_user_id_admin_users_id_fk" FOREIGN KEY ("created_by_admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;