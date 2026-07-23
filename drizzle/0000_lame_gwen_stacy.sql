CREATE SEQUENCE "public"."order_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1001 CACHE 1;--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"company" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" text,
	"product_slug" text NOT NULL,
	"product_title" text NOT NULL,
	"product_type" text NOT NULL,
	"purchase_mode" text NOT NULL,
	"quantity" integer NOT NULL,
	"selected_package" jsonb,
	"selected_options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selected_add_ons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unit_price" integer NOT NULL,
	"deposit_amount" integer,
	"line_subtotal" integer NOT NULL,
	"intake_required" boolean,
	"intake_form_slug" text,
	"intake_status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"status" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"pricing_summary" jsonb NOT NULL,
	"notes" text,
	"source" text DEFAULT 'checkout' NOT NULL,
	"client_request_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"product_type" text NOT NULL,
	"title" text NOT NULL,
	"short_title" text NOT NULL,
	"summary" text NOT NULL,
	"full_description" text NOT NULL,
	"status" text NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"category" text NOT NULL,
	"pricing" jsonb NOT NULL,
	"related_service_slug" text,
	"cta_label" text NOT NULL,
	"seo" jsonb NOT NULL,
	"media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"options" jsonb,
	"packages" jsonb,
	"add_ons" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_email_unique" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_number_unique" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_client_request_id_unique" ON "orders" USING btree ("client_request_id");