-- V001: Enable required PostgreSQL extensions
-- Run once on a fresh Supabase project before any other migration.

-- UUID generation (pgcrypto or uuid-ossp — Supabase ships both)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- For future full-text search on pipeline names / descriptions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
