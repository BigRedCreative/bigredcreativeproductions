CREATE TABLE "brand_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text NOT NULL,
	"primary_color" text NOT NULL,
	"accent_color" text NOT NULL,
	"background_color" text NOT NULL,
	"surface_color" text NOT NULL,
	"text_color" text NOT NULL,
	"muted_text_color" text NOT NULL,
	"border_color" text NOT NULL,
	"button_background" text NOT NULL,
	"button_text" text NOT NULL,
	"button_hover_background" text NOT NULL,
	"logo_horizontal_media_asset_id" text,
	"logo_white_media_asset_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_settings" ADD CONSTRAINT "brand_settings_logo_horizontal_media_asset_id_media_assets_id_fk" FOREIGN KEY ("logo_horizontal_media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_settings" ADD CONSTRAINT "brand_settings_logo_white_media_asset_id_media_assets_id_fk" FOREIGN KEY ("logo_white_media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
-- Seed data below: copied verbatim from the CURRENT LIVE CSS custom
-- property defaults in src/app/globals.css (:root), so the first
-- database-backed render will be byte-identical to what's live today once
-- the Phase 16 CSS refactor and <BrandTokens /> component land. Both rows
-- (draft and published) start in sync, exactly like Phase 14's
-- homepage_content seed. Logo fields are seeded NULL — no draft logo
-- selection exists yet, so the public site falls back to
-- site_settings.logoHorizontalSrc/logoWhiteSrc exactly as it does today.
INSERT INTO "brand_settings" (
	"status", "primary_color", "accent_color", "background_color", "surface_color",
	"text_color", "muted_text_color", "border_color",
	"button_background", "button_text", "button_hover_background",
	"logo_horizontal_media_asset_id", "logo_white_media_asset_id"
) VALUES
	(
		'draft',
		'#D71920', '#F5FF35', '#EFE9DF', '#FFFFFF',
		'#0B0B0B', '#777777', '#0B0B0B',
		'#0B0B0B', '#FFFFFF', '#D71920',
		NULL, NULL
	),
	(
		'published',
		'#D71920', '#F5FF35', '#EFE9DF', '#FFFFFF',
		'#0B0B0B', '#777777', '#0B0B0B',
		'#0B0B0B', '#FFFFFF', '#D71920',
		NULL, NULL
	);