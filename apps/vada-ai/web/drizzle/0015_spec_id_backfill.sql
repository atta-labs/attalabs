UPDATE "sessions" SET "spec_id" = REPLACE("spec_id", '-v1', '') WHERE "spec_id" LIKE '%-v1';
