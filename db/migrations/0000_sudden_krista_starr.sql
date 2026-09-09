CREATE TYPE "public"."source_level" AS ENUM('official_government', 'official_institution', 'verified_social', 'trusted_secondary', 'news_aggregator');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('draft', 'needs_review', 'published', 'expired', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('job', 'admission', 'result', 'exam', 'notice', 'article');--> statement-breakpoint
CREATE TYPE "public"."alert_channel" AS ENUM('email', 'telegram');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_bangla" varchar(255),
	"slug" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"logo_url" text,
	"official_website" text,
	"description" text,
	"district" varchar(100),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "raw_contents" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"source_url" text NOT NULL,
	"raw_html" text,
	"extracted_text" text,
	"content_hash" varchar(64) NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processing_error" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"organization_id" integer,
	"base_url" text NOT NULL,
	"level" "source_level" NOT NULL,
	"adapter_key" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_crawled_at" timestamp,
	"last_success_at" timestamp,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "post_type" NOT NULL,
	"title" varchar(500) NOT NULL,
	"slug" varchar(500) NOT NULL,
	"excerpt" text,
	"content" text,
	"organization_id" integer,
	"category_slug" varchar(100),
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"source_id" integer,
	"source_url" text NOT NULL,
	"source_name" varchar(255),
	"source_published_at" timestamp,
	"original_hash" varchar(64),
	"ai_generated" boolean DEFAULT true NOT NULL,
	"ai_model" varchar(100),
	"quality_score" real,
	"seo_title" varchar(255),
	"seo_description" varchar(500),
	"canonical_url" text,
	"featured_image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"vacancy" integer,
	"employment_type" varchar(50),
	"job_location" varchar(255),
	"education" text,
	"experience" text,
	"age_limit" varchar(100),
	"salary_min" integer,
	"salary_max" integer,
	"salary_text" varchar(255),
	"application_start" timestamp,
	"application_deadline" timestamp,
	"application_method" varchar(100),
	"application_url" text,
	"official_notice_url" text,
	"valid_through" timestamp,
	CONSTRAINT "job_details_post_id_unique" UNIQUE("post_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admission_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"program" varchar(255),
	"academic_year" varchar(20),
	"application_start" timestamp,
	"application_deadline" timestamp,
	"admission_test_date" timestamp,
	"result_date" timestamp,
	"eligibility" text,
	"gpa_requirement" varchar(100),
	"application_fee" varchar(100),
	"application_url" text,
	"notice_url" text,
	"units" jsonb,
	"important_dates" jsonb,
	CONSTRAINT "admission_details_post_id_unique" UNIQUE("post_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "result_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"result_type" varchar(100),
	"exam_name" varchar(255),
	"year" varchar(10),
	"published_date" timestamp,
	"official_result_url" text NOT NULL,
	"how_to_check" text,
	"sms_method" text,
	"required_information" text,
	CONSTRAINT "result_details_post_id_unique" UNIQUE("post_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alert_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"post_id" integer NOT NULL,
	"delivery_type" varchar(30) NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alert_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel" "alert_channel" NOT NULL,
	"email" varchar(255),
	"telegram_chat_id" varchar(100),
	"filters" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"verified_at" timestamp,
	"unsubscribe_token" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_token" varchar(100) NOT NULL,
	"post_id" integer NOT NULL,
	"saved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "raw_contents" ADD CONSTRAINT "raw_contents_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sources" ADD CONSTRAINT "sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_details" ADD CONSTRAINT "job_details_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admission_details" ADD CONSTRAINT "admission_details_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "result_details" ADD CONSTRAINT "result_details_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_subscription_id_alert_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."alert_subscriptions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
