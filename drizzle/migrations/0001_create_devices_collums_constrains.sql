ALTER TABLE "devices" ADD CONSTRAINT "devices_name_unique" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_name_length_check" CHECK (length("devices"."name") >= 5);--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_brand_value_check" CHECK ("devices"."brand" IN ('Apple', 'Samsung', 'Google', 'Sony', 'Huawei'));