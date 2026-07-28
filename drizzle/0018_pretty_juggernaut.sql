ALTER TABLE "orders" ADD COLUMN "payment_access_token_hash" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_access_token_expires_at" timestamp with time zone;