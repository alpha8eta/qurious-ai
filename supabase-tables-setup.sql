-- Qurious AI Database Setup for Supabase
-- Run this script in the Supabase SQL Editor to create all required tables
-- Based on lib/db/schema.ts

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- CHATS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS "chats" (
    "id" VARCHAR(191) PRIMARY KEY NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "title" TEXT NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "visibility" VARCHAR(256) DEFAULT 'private' NOT NULL,
    CONSTRAINT "chats_visibility_check" CHECK ("visibility" IN ('public', 'private'))
);

-- Create indexes for chats table
CREATE INDEX IF NOT EXISTS "chats_user_id_idx" ON "chats" ("user_id");
CREATE INDEX IF NOT EXISTS "chats_user_id_created_at_idx" ON "chats" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "chats_created_at_idx" ON "chats" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "chats_id_user_id_idx" ON "chats" ("id", "user_id");

-- ===========================================
-- MESSAGES TABLE  
-- ===========================================
CREATE TABLE IF NOT EXISTS "messages" (
    "id" VARCHAR(191) PRIMARY KEY NOT NULL,
    "chat_id" VARCHAR(191) NOT NULL,
    "role" VARCHAR(256) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE,
    "metadata" JSONB,
    CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE
);

-- Create indexes for messages table
CREATE INDEX IF NOT EXISTS "messages_chat_id_idx" ON "messages" ("chat_id");
CREATE INDEX IF NOT EXISTS "messages_chat_id_created_at_idx" ON "messages" ("chat_id", "created_at");

-- ===========================================
-- PARTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS "parts" (
    "id" VARCHAR(191) PRIMARY KEY NOT NULL,
    "message_id" VARCHAR(191) NOT NULL,
    "order" INTEGER NOT NULL,
    "type" VARCHAR(256) NOT NULL,
    
    -- Text parts
    "text_text" TEXT,
    
    -- Reasoning parts  
    "reasoning_text" TEXT,
    
    -- File parts
    "file_media_type" VARCHAR(256),
    "file_filename" VARCHAR(1024),
    "file_url" TEXT,
    
    -- Source URL parts
    "source_url_source_id" VARCHAR(256),
    "source_url_url" TEXT,
    "source_url_title" TEXT,
    
    -- Source document parts
    "source_document_source_id" VARCHAR(256),
    "source_document_media_type" VARCHAR(256),
    "source_document_title" TEXT,
    "source_document_filename" VARCHAR(1024),
    "source_document_url" TEXT,
    "source_document_snippet" TEXT,
    
    -- Tool parts (generic)
    "tool_tool_call_id" VARCHAR(256),
    "tool_state" VARCHAR(256),
    "tool_error_text" TEXT,
    
    -- Tool-specific columns (Qurious AI tools)
    "tool_search_input" JSON,
    "tool_search_output" JSON,
    "tool_fetch_input" JSON,
    "tool_fetch_output" JSON,
    "tool_question_input" JSON,
    "tool_question_output" JSON,
    
    -- Todo tool columns
    "tool_todoWrite_input" JSON,
    "tool_todoWrite_output" JSON,
    "tool_todoRead_input" JSON,
    "tool_todoRead_output" JSON,
    
    -- Dynamic tools
    "tool_dynamic_input" JSON,
    "tool_dynamic_output" JSON,
    "tool_dynamic_name" VARCHAR(256),
    "tool_dynamic_type" VARCHAR(256),
    
    -- Data parts
    "data_prefix" VARCHAR(256),
    "data_content" JSON,
    "data_id" VARCHAR(256),
    
    -- Provider metadata
    "provider_metadata" JSON,
    
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT "parts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE,
    CONSTRAINT "text_text_required" CHECK ("type" != 'text' OR "text_text" IS NOT NULL),
    CONSTRAINT "reasoning_text_required" CHECK ("type" != 'reasoning' OR "reasoning_text" IS NOT NULL),
    CONSTRAINT "file_fields_required" CHECK (
        "type" != 'file' OR 
        ("file_media_type" IS NOT NULL AND "file_filename" IS NOT NULL AND "file_url" IS NOT NULL)
    ),
    CONSTRAINT "tool_state_valid" CHECK (
        "tool_state" IS NULL OR 
        "tool_state" IN ('input-streaming', 'input-available', 'output-available', 'output-error')
    ),
    CONSTRAINT "tool_fields_required" CHECK (
        "type" NOT LIKE 'tool-%' OR 
        ("tool_tool_call_id" IS NOT NULL AND "tool_state" IS NOT NULL)
    )
);

-- Create indexes for parts table
CREATE INDEX IF NOT EXISTS "parts_message_id_idx" ON "parts" ("message_id");
CREATE INDEX IF NOT EXISTS "parts_message_id_order_idx" ON "parts" ("message_id", "order");

-- ===========================================
-- FEEDBACK TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS "feedback" (
    "id" VARCHAR(191) PRIMARY KEY NOT NULL,
    "user_id" VARCHAR(255),
    "sentiment" VARCHAR(256) NOT NULL,
    "message" TEXT NOT NULL,
    "page_url" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT "feedback_sentiment_check" CHECK ("sentiment" IN ('positive', 'neutral', 'negative'))
);

-- Create indexes for feedback table
CREATE INDEX IF NOT EXISTS "feedback_user_id_idx" ON "feedback" ("user_id");
CREATE INDEX IF NOT EXISTS "feedback_created_at_idx" ON "feedback" ("created_at");

-- ===========================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- ===========================================
-- Enable RLS on all tables
ALTER TABLE "chats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;  
ALTER TABLE "parts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chats table
CREATE POLICY "users_manage_own_chats" ON "chats"
    FOR ALL 
    TO PUBLIC
    USING ("user_id" = current_setting('app.current_user_id', true))
    WITH CHECK ("user_id" = current_setting('app.current_user_id', true));

CREATE POLICY "public_chats_readable" ON "chats"
    FOR SELECT
    TO PUBLIC  
    USING ("visibility" = 'public');

-- Create RLS policies for messages table
CREATE POLICY "users_manage_chat_messages" ON "messages"
    FOR ALL
    TO PUBLIC
    USING (EXISTS (
        SELECT 1 FROM "chats"
        WHERE "chats"."id" = "chat_id"
        AND "chats"."user_id" = current_setting('app.current_user_id', true)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "chats"
        WHERE "chats"."id" = "chat_id"
        AND "chats"."user_id" = current_setting('app.current_user_id', true)
    ));

CREATE POLICY "public_chat_messages_readable" ON "messages"
    FOR SELECT
    TO PUBLIC
    USING (EXISTS (
        SELECT 1 FROM "chats"
        WHERE "chats"."id" = "chat_id"
        AND "chats"."visibility" = 'public'
    ));

-- Create RLS policies for parts table
CREATE POLICY "users_manage_message_parts" ON "parts"
    FOR ALL
    TO PUBLIC
    USING (EXISTS (
        SELECT 1 FROM "messages"
        INNER JOIN "chats" ON "chats"."id" = "messages"."chat_id"
        WHERE "messages"."id" = "message_id"
        AND "chats"."user_id" = current_setting('app.current_user_id', true)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "messages"
        INNER JOIN "chats" ON "chats"."id" = "messages"."chat_id"
        WHERE "messages"."id" = "message_id"
        AND "chats"."user_id" = current_setting('app.current_user_id', true)
    ));

CREATE POLICY "public_chat_parts_readable" ON "parts"
    FOR SELECT
    TO PUBLIC
    USING (EXISTS (
        SELECT 1 FROM "messages"
        INNER JOIN "chats" ON "chats"."id" = "messages"."chat_id"
        WHERE "messages"."id" = "message_id"
        AND "chats"."visibility" = 'public'
    ));

-- Create RLS policies for feedback table
CREATE POLICY "feedback_select_policy" ON "feedback"
    FOR SELECT
    TO PUBLIC
    USING (true);

CREATE POLICY "anyone_can_insert_feedback" ON "feedback"
    FOR INSERT
    TO PUBLIC
    WITH CHECK (true);

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================
-- You can run these queries after the above script to verify everything worked

-- Check that all tables were created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chats', 'messages', 'parts', 'feedback')
ORDER BY table_name;

-- Check indexes were created
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('chats', 'messages', 'parts', 'feedback')
ORDER BY tablename, indexname;

-- Check foreign key constraints
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('chats', 'messages', 'parts', 'feedback')
ORDER BY tc.table_name;

-- Success message
SELECT 'All tables created successfully! You can now use your Qurious AI application.' as status;