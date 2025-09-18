# Qurious AI Database Setup Instructions

## Overview
Your migration API is failing due to connection issues. I've created SQL scripts that you can run directly in the Supabase SQL Editor to create all required database tables for your Qurious AI application.

## 🔧 What I've Created

1. **`supabase-tables-setup.sql`** - Complete table creation script
2. **`verification-queries.sql`** - Queries to verify setup worked correctly  
3. **Connection test results** - Confirmed the connection string format is correct

## 🚀 Step-by-Step Setup Instructions

### Step 1: Access Supabase SQL Editor
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `kehiftdpknekpymtqywp`
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Run the Table Creation Script
1. Open the `supabase-tables-setup.sql` file I created
2. Copy the entire contents
3. Paste it into a new query in the Supabase SQL Editor
4. Click **Run** to execute the script

**What this creates:**
- `chats` table - Stores chat conversations
- `messages` table - Stores individual messages in chats  
- `parts` table - Stores message content parts (text, files, tool outputs, etc.)
- `feedback` table - Stores user feedback
- All necessary indexes for performance
- Row Level Security (RLS) policies for data protection
- Foreign key constraints for data integrity

### Step 3: Verify the Setup
1. Open the `verification-queries.sql` file I created
2. Copy and run each section in the Supabase SQL Editor
3. You should see:
   - 4 tables created (chats, messages, parts, feedback)
   - Multiple indexes on each table
   - Foreign key relationships between tables
   - RLS policies enabled

### Step 4: Update Your Application Configuration
Add the Supabase connection string to your environment variables:

```bash
# Add this to your .env.local or environment settings
DATABASE_URL=postgresql://postgres:hA44lRF3XFK8fANR@kehiftdpknekpymtqywp.supabase.co:6543/postgres?sslmode=require
```

### Step 5: Test the Migration API (Optional)
After setting up the tables, you can test if your migration API works:

```bash
curl -X POST http://localhost:5000/api/migrate
```

Or visit the endpoint in your browser if the dev server is running.

## 📋 Tables Created

### `chats`
- Primary table for storing chat conversations
- Columns: id, title, user_id, created_at, visibility
- Indexes on user_id and created_at for fast queries

### `messages`  
- Stores individual messages within chats
- Columns: id, chat_id, role, created_at, updated_at, metadata
- Foreign key relationship to chats table

### `parts`
- Stores the actual content of messages (text, files, tool outputs)  
- Supports all Qurious AI features: search results, reasoning, file uploads, etc.
- 40+ columns to handle different content types
- Foreign key relationship to messages table

### `feedback`
- Stores user feedback and ratings
- Columns: id, user_id, sentiment, message, page_url, created_at

## 🔐 Security Features

All tables have Row Level Security (RLS) enabled with policies that:
- Users can only access their own chats and related data
- Public chats are readable by anyone
- Feedback can be submitted by anyone
- Proper isolation between users' data

## ✅ Expected Results

After running the setup script, you should be able to:

1. ✅ Create new chats in your application
2. ✅ Send and receive messages  
3. ✅ Use all AI features (search, reasoning, file uploads)
4. ✅ Submit feedback
5. ✅ Have proper data isolation between users

## 🐛 Troubleshooting

### If you see "table already exists" errors:
- This is normal and safe - the script uses `IF NOT EXISTS`
- The existing tables won't be modified

### If you see permission errors:
- Make sure you're logged in as the project owner in Supabase
- Check that you're in the correct project

### If the migration API still fails:
- Verify the DATABASE_URL is correctly set
- Check that your application has the postgres dependency installed
- The tables are created, so migration errors may be from other causes

## 🔄 Connection String Info

Your provided connection string is formatted correctly:
- Host: kehiftdpknekpymtqywp.supabase.co  
- Port: 6543 (Supabase's port)
- Database: postgres
- SSL mode: required (correct for Supabase)

The connection string should work once the environment variable is properly set in your application.

## 📞 Support

If you encounter issues:
1. Check the Supabase dashboard for any error messages
2. Run the verification queries to confirm tables exist
3. Check your application logs for specific error messages
4. Ensure the DATABASE_URL environment variable is set correctly