CREATE TABLE "portfolio_project_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"version_type" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"short_title" text NOT NULL,
	"category" text NOT NULL,
	"services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text NOT NULL,
	"full_description" text NOT NULL,
	"client" text,
	"year" text,
	"featured" boolean DEFAULT false NOT NULL,
	"class_name" text NOT NULL,
	"stamp" text NOT NULL,
	"hero_media_asset_id" text,
	"hero_image_src" text,
	"hero_image_alt" text,
	"gallery" jsonb,
	"external_link" jsonb,
	"results" jsonb,
	"credits" jsonb,
	"seo" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" text NOT NULL,
	"version_type" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"short_title" text NOT NULL,
	"service_number" text NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"summary" text NOT NULL,
	"full_description" text NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"deliverables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"process" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cta_label" text NOT NULL,
	"hero_media_asset_id" text,
	"hero_image_src" text,
	"hero_image_alt" text,
	"gallery" jsonb,
	"seo" jsonb NOT NULL,
	"starting_price" integer,
	"pricing_note" text,
	"turnaround" text,
	"revisions" text,
	"deposit_amount" integer,
	"purchasable" boolean,
	"intake_form_slug" text,
	"cart_eligible" boolean,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portfolio_project_versions" ADD CONSTRAINT "portfolio_project_versions_project_id_portfolio_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."portfolio_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_project_versions" ADD CONSTRAINT "portfolio_project_versions_hero_media_asset_id_media_assets_id_fk" FOREIGN KEY ("hero_media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_versions" ADD CONSTRAINT "service_versions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_versions" ADD CONSTRAINT "service_versions_hero_media_asset_id_media_assets_id_fk" FOREIGN KEY ("hero_media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_project_versions_project_id_version_type_unique" ON "portfolio_project_versions" USING btree ("project_id","version_type");--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_project_versions_slug_draft_unique" ON "portfolio_project_versions" USING btree ("slug") WHERE "portfolio_project_versions"."version_type" = 'draft';--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_project_versions_slug_published_unique" ON "portfolio_project_versions" USING btree ("slug") WHERE "portfolio_project_versions"."version_type" = 'published';--> statement-breakpoint
CREATE UNIQUE INDEX "service_versions_service_id_version_type_unique" ON "service_versions" USING btree ("service_id","version_type");--> statement-breakpoint
CREATE UNIQUE INDEX "service_versions_slug_draft_unique" ON "service_versions" USING btree ("slug") WHERE "service_versions"."version_type" = 'draft';--> statement-breakpoint
CREATE UNIQUE INDEX "service_versions_slug_published_unique" ON "service_versions" USING btree ("slug") WHERE "service_versions"."version_type" = 'published';