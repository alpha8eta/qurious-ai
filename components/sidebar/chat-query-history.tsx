'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { MessageCircle } from 'lucide-react'

import { Chat } from '@/lib/db/schema'
import type { UIMessage } from '@/lib/types/ai'
import { getTextFromParts } from '@/lib/utils/message-utils'

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar'

import { Spinner } from '../ui/spinner'

interface ChatQueryHistoryProps {
  chatId: string
  isExpanded: boolean
}

interface QueryItem {
  id: string
  content: string
  timestamp?: Date
}

// Simple in-memory cache for chat queries (cleared on each session)
const queryCache = new Map<string, QueryItem[]>()

// Clear all cached queries on component load to ensure fresh data
queryCache.clear()

export function ChatQueryHistory({
  chatId,
  isExpanded
}: ChatQueryHistoryProps) {
  const [queries, setQueries] = useState<QueryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, setOpenMobile, setOpen } = useSidebar()

  // Fetch chat messages when expanded and extract user queries
  useEffect(() => {
    if (!isExpanded || !chatId) return

    // Clear cache to avoid persisting empty results
    queryCache.delete(chatId)

    const fetchQueries = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/chat/${chatId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch chat')
        }

        const chat: Chat & { messages: UIMessage[] } = await response.json()

        // Extract user queries from UIMessage format
        const userQueries: QueryItem[] = []
        let userIndex = 0

        if (chat.messages && Array.isArray(chat.messages)) {
          chat.messages.forEach((message: UIMessage) => {
            // Match user messages
            if (message.role === 'user') {
              // Extract content from parts array using utility function
              const content = getTextFromParts(message.parts)

              if (content && content.trim().length > 0) {
                // Use canonical anchor ID - same logic as in chat.tsx section builder
                const queryId = message.id ?? `u-${userIndex}`
                userQueries.push({
                  id: queryId,
                  content: content.trim(),
                  timestamp: (message.metadata as any)?.createdAt
                    ? new Date((message.metadata as any).createdAt)
                    : undefined
                })
              }
              userIndex++
            }
          })
        }

        // Cache the queries
        queryCache.set(chatId, userQueries)
        setQueries(userQueries)
      } catch (error) {
        console.error('Failed to fetch chat queries:', error)
        setQueries([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchQueries()
  }, [isExpanded, chatId])

  // Function to navigate to specific query in chat
  const handleQueryClick = (queryId: string) => {
    // Skip if query ID is undefined or empty
    if (!queryId) {
      console.warn('Cannot navigate to query with undefined or empty ID')
      return
    }

    const chatPath = `/search/${chatId}`
    const targetUrl = `${chatPath}#section-${queryId}`

    // Close the sidebar before navigation
    if (isMobile) {
      setOpenMobile(false)
      // Add a delay to ensure mobile sidebar closes before navigation
      setTimeout(() => {
        navigateToQuery(targetUrl, chatPath, queryId)
      }, 250)
    } else {
      setOpen(false)
      navigateToQuery(targetUrl, chatPath, queryId)
    }
  }

  const navigateToQuery = (
    targetUrl: string,
    chatPath: string,
    queryId: string
  ) => {
    if (pathname !== chatPath) {
      // Navigate to different chat page with hash, preserving SPA behavior
      router.push(targetUrl, { scroll: false })
    } else {
      // Already on the chat page, update hash and scroll
      window.location.hash = `section-${queryId}`
      scrollToQuery(queryId)
    }
  }

  const scrollToQuery = (queryId: string) => {
    const targetId = `section-${queryId}`
    const element = document.getElementById(targetId)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
      // Optional: Add a brief highlight effect
      element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50')
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50')
      }, 2000)
    }
  }

  if (!isExpanded) return null

  return (
    <div className="ml-4 border-l border-sidebar-border/50">
      {isLoading ? (
        <div className="flex items-center justify-center py-2 pl-2">
          <Spinner className="size-3" />
          <span className="ml-2 text-xs text-muted-foreground">
            Loading queries...
          </span>
        </div>
      ) : queries.length > 0 ? (
        <SidebarMenu>
          {queries.map((query, index) => (
            <SidebarMenuItem key={query.id} className="ml-2">
              <SidebarMenuButton
                onClick={() => handleQueryClick(query.id)}
                className="h-auto flex-col gap-1 items-start p-2 text-xs hover:bg-sidebar-accent"
              >
                <div className="flex items-center gap-1 w-full">
                  <MessageCircle className="size-3 shrink-0 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Query {index + 1}
                  </span>
                </div>
                <div className="text-xs font-normal text-left line-clamp-2 w-full text-sidebar-foreground/80">
                  {query.content}
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      ) : (
        <div className="py-2 pl-4 text-xs text-muted-foreground">
          No queries found
        </div>
      )}
    </div>
  )
}
