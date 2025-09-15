'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getRedisClient, RedisWrapper } from '@/lib/redis/config'
import { type Chat } from '@/lib/types'

async function getRedis(): Promise<RedisWrapper> {
  return await getRedisClient()
}

const CHAT_VERSION = 'v2'
function getUserChatKey(userId: string) {
  return `user:${CHAT_VERSION}:chat:${userId}`
}

// Helper functions for threading Redis keys
function getUserRootsKey(userId: string) {
  return `user:${CHAT_VERSION}:chat:${userId}:roots`
}

function getChatChildrenKey(chatId: string) {
  return `chat:${chatId}:children`
}

// Helper function to normalize chat objects with threading fields for backward compatibility
function normalizeChatThreading(chat: any): Chat {
  const now = new Date()
  
  // Properly handle parentId - coerce "null", "", undefined to null
  const parentId = (chat.parentId === null || chat.parentId === undefined || 
                    chat.parentId === "null" || chat.parentId === "") ? null : chat.parentId
  
  return {
    ...chat,
    // Ensure threading fields exist with sensible defaults and proper types
    parentId,
    rootId: chat.rootId || chat.id, // Use || instead of ?? to handle empty strings
    depth: Number.isFinite(Number(chat.depth)) ? Number(chat.depth) : 0,
    childrenCount: Number.isFinite(Number(chat.childrenCount)) ? Number(chat.childrenCount) : 0,
    lastActivityAt: chat.lastActivityAt ? new Date(chat.lastActivityAt) : chat.createdAt ? new Date(chat.createdAt) : now,
    updatedAt: chat.updatedAt ? new Date(chat.updatedAt) : chat.createdAt ? new Date(chat.createdAt) : now,
    // Ensure createdAt is a Date object
    createdAt: chat.createdAt ? new Date(chat.createdAt) : now
  } as Chat
}

export async function getChats(userId?: string | null) {
  if (!userId) {
    return []
  }

  try {
    const redis = await getRedis()
    const chats = await redis.zrange(getUserChatKey(userId), 0, -1, {
      rev: true
    })

    if (chats.length === 0) {
      return []
    }

    const results = await Promise.all(
      chats.map(async chatKey => {
        const chat = await redis.hgetall(chatKey)
        return chat
      })
    )

    return results
      .filter((result): result is Record<string, any> => {
        if (result === null || Object.keys(result).length === 0) {
          return false
        }
        return true
      })
      .map(chat => {
        const plainChat = { ...chat }
        if (typeof plainChat.messages === 'string') {
          try {
            plainChat.messages = JSON.parse(plainChat.messages)
          } catch (error) {
            plainChat.messages = []
          }
        }
        // Normalize with threading support and date conversion
        return normalizeChatThreading(plainChat)
      })
  } catch (error) {
    return []
  }
}

export async function getChatsPage(
  userId: string,
  limit = 20,
  offset = 0
): Promise<{ chats: Chat[]; nextOffset: number | null }> {
  try {
    const redis = await getRedis()
    const userChatKey = getUserChatKey(userId)
    const start = offset
    const end = offset + limit - 1

    const chatKeys = await redis.zrange(userChatKey, start, end, {
      rev: true
    })

    if (chatKeys.length === 0) {
      return { chats: [], nextOffset: null }
    }

    const results = await Promise.all(
      chatKeys.map(async chatKey => {
        const chat = await redis.hgetall(chatKey)
        return chat
      })
    )

    const chats = results
      .filter((result): result is Record<string, any> => {
        if (result === null || Object.keys(result).length === 0) {
          return false
        }
        return true
      })
      .map(chat => {
        const plainChat = { ...chat }
        if (typeof plainChat.messages === 'string') {
          try {
            plainChat.messages = JSON.parse(plainChat.messages)
          } catch (error) {
            plainChat.messages = []
          }
        }
        // Normalize with threading support and date conversion
        return normalizeChatThreading(plainChat)
      })

    const nextOffset = chatKeys.length === limit ? offset + limit : null
    return { chats, nextOffset }
  } catch (error) {
    console.error('Error fetching chat page:', error)
    return { chats: [], nextOffset: null }
  }
}

export async function getChat(id: string, userId: string = 'anonymous') {
  const redis = await getRedis()
  const chat = await redis.hgetall<Chat>(`chat:${id}`)

  if (!chat) {
    return null
  }

  // Parse the messages if they're stored as a string
  if (typeof chat.messages === 'string') {
    try {
      chat.messages = JSON.parse(chat.messages)
    } catch (error) {
      chat.messages = []
    }
  }

  // Ensure messages is always an array
  if (!Array.isArray(chat.messages)) {
    chat.messages = []
  }

  // Normalize with threading support and date conversion
  return normalizeChatThreading(chat)
}

export async function clearChats(
  userId: string = 'anonymous'
): Promise<{ error?: string }> {
  const redis = await getRedis()
  const userChatKey = getUserChatKey(userId)
  const userRootsKey = getUserRootsKey(userId)
  const chats = await redis.zrange(userChatKey, 0, -1)
  if (!chats.length) {
    return { error: 'No chats to clear' }
  }
  const pipeline = redis.pipeline()

  for (const chat of chats) {
    // Extract chat ID from chat key for children cleanup
    const chatId = chat.replace('chat:', '')
    // Delete chat data
    pipeline.del(chat)
    // Remove from main user list
    pipeline.zrem(userChatKey, chat)
    // Remove from roots list (if it exists there)
    pipeline.zrem(userRootsKey, chat)
    // Clean up any children of this chat
    pipeline.del(getChatChildrenKey(chatId))
  }

  await pipeline.exec()

  revalidatePath('/')
  redirect('/')
}

export async function deleteChat(
  chatId: string,
  userId = 'anonymous'
): Promise<{ error?: string }> {
  try {
    const redis = await getRedis()
    const userKey = getUserChatKey(userId)
    const chatKey = `chat:${chatId}`

    const chatDetails = await redis.hgetall<Chat>(chatKey)
    if (!chatDetails || Object.keys(chatDetails).length === 0) {
      console.warn(`Attempted to delete non-existent chat: ${chatId}`)
      return { error: 'Chat not found' }
    }

    // Optional: Check if the chat actually belongs to the user if userId is provided and matters
    // if (chatDetails.userId !== userId) {
    //  console.warn(`Unauthorized attempt to delete chat ${chatId} by user ${userId}`)
    //  return { error: 'Unauthorized' }
    // }

    const normalizedChat = normalizeChatThreading(chatDetails)
    const chatUserId = normalizedChat.userId || userId
    const pipeline = redis.pipeline()
    
    // Delete the chat data
    pipeline.del(chatKey)
    
    // Remove from user's main chat list
    pipeline.zrem(getUserChatKey(chatUserId), chatKey)

    // THREADING SCHEMA CLEANUP:
    if (normalizedChat.parentId === null) {
      // This is a root chat - remove from user's roots collection
      pipeline.zrem(getUserRootsKey(chatUserId), chatKey)
    } else {
      // This is a child chat - remove from parent's children collection
      pipeline.zrem(getChatChildrenKey(normalizedChat.parentId), chatKey)
      
      // Update parent chat's childrenCount atomically
      const parentChatKey = `chat:${normalizedChat.parentId}`
      pipeline.hincrby(parentChatKey, 'childrenCount', -1)
      pipeline.hmset(parentChatKey, {
        updatedAt: new Date().toISOString()
      })
    }
    
    // Clean up any children of this chat (simple deletion - in production you might want to move children up one level)
    pipeline.del(getChatChildrenKey(chatId))

    await pipeline.exec()

    // Revalidate the root path where the chat history is displayed
    revalidatePath('/')

    return {}
  } catch (error) {
    console.error(`Error deleting chat ${chatId}:`, error)
    return { error: 'Failed to delete chat' }
  }
}

export async function saveChat(chat: Chat, userId: string = 'anonymous') {
  try {
    const redis = await getRedis()
    const pipeline = redis.pipeline()
    const now = new Date()

    // Ensure timestamps are set and serialize dates to ISO strings for consistent storage
    const chatToSave = {
      ...chat,
      messages: JSON.stringify(chat.messages),
      // Serialize Date objects to ISO strings for reliable storage and parsing
      createdAt: chat.createdAt ? chat.createdAt.toISOString() : now.toISOString(),
      updatedAt: chat.updatedAt ? chat.updatedAt.toISOString() : now.toISOString(),
      lastActivityAt: chat.lastActivityAt ? chat.lastActivityAt.toISOString() : now.toISOString(),
      // Handle parentId properly - store empty string for null to avoid "null" string
      parentId: chat.parentId || ""
    }

    // Save the chat data
    pipeline.hmset(`chat:${chat.id}`, chatToSave)
    
    // Use lastActivityAt for thread ordering instead of Date.now()
    const sortScore = chat.lastActivityAt ? chat.lastActivityAt.getTime() : now.getTime()
    
    // Add to user's main chat list (keep for backward compatibility)
    pipeline.zadd(getUserChatKey(userId), sortScore, `chat:${chat.id}`)

    // NEW THREADING SCHEMA:
    if (chat.parentId === null) {
      // This is a root chat - add to user's roots collection
      pipeline.zadd(getUserRootsKey(userId), sortScore, `chat:${chat.id}`)
    } else {
      // This is a child chat - add to parent's children collection
      pipeline.zadd(getChatChildrenKey(chat.parentId), sortScore, `chat:${chat.id}`)
      
      // Update parent chat's metadata atomically
      const parentChatKey = `chat:${chat.parentId}`
      // Get current parent data to determine correct user keys
      const parentChat = await redis.hgetall<Chat>(parentChatKey)
      if (parentChat) {
        const normalizedParent = normalizeChatThreading(parentChat)
        const parentUserId = normalizedParent.userId || userId // fallback to current user
        
        // Use atomic increment for childrenCount to avoid race conditions
        pipeline.hincrby(parentChatKey, 'childrenCount', 1)
        // Update lastActivityAt separately 
        pipeline.hmset(parentChatKey, {
          lastActivityAt: chatToSave.lastActivityAt
        })
        
        // Update parent's position in correct user's lists based on new activity
        pipeline.zadd(getUserChatKey(parentUserId), sortScore, `chat:${chat.parentId}`)
        if (normalizedParent.parentId === null) {
          // Parent is a root, update its position in roots collection
          pipeline.zadd(getUserRootsKey(parentUserId), sortScore, `chat:${chat.parentId}`)
        }
      }
    }

    const results = await pipeline.exec()

    return results
  } catch (error) {
    throw error
  }
}

export async function getSharedChat(id: string) {
  const redis = await getRedis()
  const chat = await redis.hgetall<Chat>(`chat:${id}`)

  if (!chat || !chat.sharePath) {
    return null
  }

  // Parse the messages if they're stored as a string
  if (typeof chat.messages === 'string') {
    try {
      chat.messages = JSON.parse(chat.messages)
    } catch (error) {
      chat.messages = []
    }
  }

  // Ensure messages is always an array
  if (!Array.isArray(chat.messages)) {
    chat.messages = []
  }

  // Normalize with threading support and date conversion
  return normalizeChatThreading(chat)
}

export async function shareChat(id: string, userId: string = 'anonymous') {
  const redis = await getRedis()
  const chat = await redis.hgetall<Chat>(`chat:${id}`)

  if (!chat || chat.userId !== userId) {
    return null
  }

  const payload = {
    ...chat,
    sharePath: `/share/${id}`
  }

  await redis.hmset(`chat:${id}`, payload)

  return payload
}
