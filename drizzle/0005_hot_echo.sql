CREATE TABLE "contact_content" (
	"id" text PRIMARY KEY NOT NULL,
	"kicker" text NOT NULL,
	"heading" text NOT NULL,
	"description" text NOT NULL,
	"submit_label" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homepage_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text NOT NULL,
	"badge_primary" text NOT NULL,
	"badge_secondary" text NOT NULL,
	"eyebrow" text NOT NULL,
	"headline_lead" text NOT NULL,
	"headline_accent" text NOT NULL,
	"tagline" text NOT NULL,
	"supporting_copy" text NOT NULL,
	"cta_label" text NOT NULL,
	"cta_href" text NOT NULL,
	"hero_image_src" text,
	"hero_image_alt" text,
	"secondary_cta_label" text,
	"secondary_cta_href" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "navigation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement" text NOT NULL,
	"label" text NOT NULL,
	"href" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"site_name" text NOT NULL,
	"legal_name" text NOT NULL,
	"tagline" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"location" text NOT NULL,
	"social_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"meta_title" text NOT NULL,
	"meta_description" text NOT NULL,
	"og_description" text NOT NULL,
	"og_image_src" text,
	"canonical_url" text NOT NULL,
	"logo_horizontal_src" text NOT NULL,
	"logo_white_src" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Seed data below: copied verbatim from the CURRENT LIVE TypeScript content
-- (src/config/site.ts, src/data/homepage.ts, src/data/navigation.ts) so the
-- first database-backed render is byte-identical to what's live today. See
-- CLAUDE.md "Website content admin" for the fallback/migration-safety
-- writeup this satisfies.
INSERT INTO "site_settings" (
	"id", "site_name", "legal_name", "tagline", "contact_email", "contact_phone",
	"location", "social_links", "meta_title", "meta_description", "og_description",
	"og_image_src", "canonical_url", "logo_horizontal_src", "logo_white_src"
) VALUES (
	'default',
	'Big Red Creative Productions',
	'Big Red Creative Productions LLC',
	'Branding · Print · Promotions · Events',
	'hello@bigredcreativeproductions.com',
	NULL,
	'Michigan · Available nationwide',
	'[]'::jsonb,
	'Big Red Creative Productions | Branding, Print, Promotions & Events',
	'Michigan creative production company delivering branding, graphic design, packaging, print production, promotions and event management.',
	'Bold branding, print, promotions and unforgettable events.',
	NULL,
	'https://bigredcreativeproductions.com',
	'/brand/logo-horizontal.svg',
	'/brand/logo-white.svg'
);
--> statement-breakpoint
INSERT INTO "navigation_items" ("placement", "label", "href", "enabled", "sort_order") VALUES
	('primary', 'Services', '/#services', true, 0),
	('primary', 'Work', '/#work', true, 1),
	('primary', 'Store', '/store', true, 2),
	('primary', 'Studio', '/#studio', true, 3),
	('primary', 'Contact', '/#contact', true, 4),
	('header_cta', 'Book the vision', '/#contact', true, 0);
--> statement-breakpoint
INSERT INTO "homepage_content" (
	"status", "badge_primary", "badge_secondary", "eyebrow", "headline_lead",
	"headline_accent", "tagline", "supporting_copy", "cta_label", "cta_href",
	"hero_image_src", "hero_image_alt", "secondary_cta_label", "secondary_cta_href"
) VALUES
	(
		'draft',
		'BUILT DIFFERENT',
		'EST. MICHIGAN',
		'Independent creative production company',
		'We make brands',
		'move culture.',
		'BRANDING · PRINT · PROMOTIONS · EVENTS',
		'Strategy, design, print, promotion and event execution with premium polish, hip-hop energy and enough grit to be remembered.',
		'See the work',
		'#work',
		NULL, NULL, NULL, NULL
	),
	(
		'published',
		'BUILT DIFFERENT',
		'EST. MICHIGAN',
		'Independent creative production company',
		'We make brands',
		'move culture.',
		'BRANDING · PRINT · PROMOTIONS · EVENTS',
		'Strategy, design, print, promotion and event execution with premium polish, hip-hop energy and enough grit to be remembered.',
		'See the work',
		'#work',
		NULL, NULL, NULL, NULL
	);
--> statement-breakpoint
INSERT INTO "contact_content" ("id", "kicker", "heading", "description", "submit_label") VALUES (
	'default',
	'Start a project',
	'Let’s make noise.',
	'Tell us what you’re building and where you need creative support.',
	'Send the vision ↗'
);
