DROP POLICY "users_manage_own_chats" ON "chats" CASCADE;--> statement-breakpoint
DROP POLICY "public_chats_readable" ON "chats" CASCADE;--> statement-breakpoint
DROP TABLE "chats" CASCADE;--> statement-breakpoint
DROP POLICY "feedback_select_policy" ON "feedback" CASCADE;--> statement-breakpoint
DROP POLICY "anyone_can_insert_feedback" ON "feedback" CASCADE;--> statement-breakpoint
DROP TABLE "feedback" CASCADE;--> statement-breakpoint
DROP POLICY "users_manage_chat_messages" ON "messages" CASCADE;--> statement-breakpoint
DROP POLICY "public_chat_messages_readable" ON "messages" CASCADE;--> statement-breakpoint
DROP TABLE "messages" CASCADE;--> statement-breakpoint
DROP POLICY "users_manage_message_parts" ON "parts" CASCADE;--> statement-breakpoint
DROP POLICY "public_chat_parts_readable" ON "parts" CASCADE;--> statement-breakpoint
DROP TABLE "parts" CASCADE;