CREATE TABLE "motion_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text NOT NULL,
	"intensity" text NOT NULL,
	"hero_entrance" text NOT NULL,
	"services_preset" text NOT NULL,
	"services_stagger" boolean DEFAULT false NOT NULL,
	"statement_preset" text NOT NULL,
	"portfolio_preset" text NOT NULL,
	"portfolio_stagger" boolean DEFAULT false NOT NULL,
	"studio_preset" text NOT NULL,
	"process_preset" text NOT NULL,
	"process_stagger" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
