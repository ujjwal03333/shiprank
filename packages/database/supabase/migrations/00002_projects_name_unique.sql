-- scan-ingester.ts upserts into projects with onConflict: "name", which
-- requires a unique constraint Postgres can use for conflict resolution.
alter table projects add constraint projects_name_key unique (name);
