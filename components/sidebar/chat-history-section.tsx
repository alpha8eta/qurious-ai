import { ChatHistoryClient } from './chat-history-client'

export async function ChatHistorySection() {
  // Always enable chat history display in development
  // const enableSaveChatHistory = process.env.ENABLE_SAVE_CHAT_HISTORY === 'true'
  // if (!enableSaveChatHistory) {
  //   return null
  // }

  return <ChatHistoryClient />
}
