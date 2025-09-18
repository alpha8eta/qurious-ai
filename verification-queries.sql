-- Verification Queries for Qurious AI Database Setup
-- Run these queries in Supabase SQL Editor after running the main setup script

-- ===========================================
-- 1. CHECK TABLES WERE CREATED
-- ===========================================
SELECT 
    table_name, 
    table_type,
    is_insertable_into as can_insert,
    is_updatable as can_update
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chats', 'messages', 'parts', 'feedback')
ORDER BY table_name;

-- ===========================================
-- 2. CHECK TABLE COLUMNS
-- ===========================================
SELECT 
    table_name,
    column_name, 
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('chats', 'messages', 'parts', 'feedback')
ORDER BY table_name, ordinal_position;

-- ===========================================
-- 3. CHECK INDEXES WERE CREATED
-- ===========================================
SELECT 
    schemaname, 
    tablename, 
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('chats', 'messages', 'parts', 'feedback')
ORDER BY tablename, indexname;

-- ===========================================
-- 4. CHECK FOREIGN KEY CONSTRAINTS
-- ===========================================
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

-- ===========================================
-- 5. CHECK ROW LEVEL SECURITY (RLS)
-- ===========================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('chats', 'messages', 'parts', 'feedback')
ORDER BY tablename;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('chats', 'messages', 'parts', 'feedback')
ORDER BY tablename, policyname;

-- ===========================================
-- 6. TEST BASIC INSERT/SELECT OPERATIONS
-- ===========================================
-- Test inserting a sample chat (replace 'test-user-id' with actual user ID when testing)
-- INSERT INTO chats (id, title, user_id) 
-- VALUES ('test-chat-1', 'Test Chat', 'test-user-id');

-- Test selecting the chat
-- SELECT id, title, user_id, created_at, visibility FROM chats WHERE id = 'test-chat-1';

-- Clean up test data
-- DELETE FROM chats WHERE id = 'test-chat-1';

-- ===========================================
-- 7. CHECK CURRENT DATABASE INFO
-- ===========================================
SELECT 
    current_database() as database_name,
    current_user as connected_user,
    session_user,
    current_setting('server_version') as postgres_version,
    now() as current_timestamp;

-- ===========================================
-- SUCCESS MESSAGE
-- ===========================================
SELECT '✅ Database setup verification completed!' as status;