CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'late');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('F', 'M');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'telebirr', 'cbe_birr', 'bank');--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"audience" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"date" date NOT NULL,
	"status" "attendance_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"grade" text NOT NULL,
	"section" text NOT NULL,
	"homeroom_teacher" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"term" text NOT NULL,
	"description" text NOT NULL,
	"amount_santim" integer NOT NULL,
	"due_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"amount_santim" integer NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text,
	"paid_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"father_name" text NOT NULL,
	"grandfather_name" text NOT NULL,
	"gender" "gender" NOT NULL,
	"class_id" integer NOT NULL,
	"guardian_name" text NOT NULL,
	"guardian_phone" text NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_student_date_uq" ON "attendance" USING btree ("student_id","date");--> statement-breakpoint
CREATE INDEX "attendance_date_idx" ON "attendance" USING btree ("date");--> statement-breakpoint
CREATE INDEX "invoices_student_idx" ON "invoices" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "payments_invoice_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "students_class_idx" ON "students" USING btree ("class_id");