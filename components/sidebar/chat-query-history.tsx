'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { MessageCircle } from 'lucide-react'

import { Chat } from '@/lib/types'

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
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

// Simple in-memory cache for chat queries
const queryCache = new Map<string, QueryItem[]>()

// Helper function to extract readable text from various content formats
const getPreviewText = (content: any): string => {
  if (typeof content === 'string') return content
  
  if (Array.isArray(content)) {
    return content
      .map((c: any) => typeof c === 'string' ? c : (c?.text ?? c?.content ?? ''))
      .filter(Boolean)
      .join(' ')
      .trim()
  }
  
  if (content && typeof content === 'object') {
    if (typeof content.text === 'string') return content.text
    if (Array.isArray((content as any).content)) return getPreviewText((content as any).content)
  }
  
  return ''
}

export function ChatQueryHistory({ chatId, isExpanded }: ChatQueryHistoryProps) {
  const [queries, setQueries] = useState<QueryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Fetch chat messages when expanded and extract user queries
  useEffect(() => {
    if (!isExpanded || !chatId) return

    // Check cache first
    const cachedQueries = queryCache.get(chatId)
    if (cachedQueries) {
      setQueries(cachedQueries)
      return
    }

    const fetchQueries = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/chat/${chatId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch chat')
        }

        const chat: Chat = await response.json()
        
        // Extract user queries from messages
        const userQueries: QueryItem[] = []
        
        if (chat.messages && Array.isArray(chat.messages)) {
          chat.messages.forEach((message: any) => {
            if (message.role === 'user' && message.content) {
              userQueries.push({
                id: message.id,
                content: getPreviewText(message.content),
                timestamp: message.createdAt ? new Date(message.createdAt) : undefined
              })
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
    const chatPath = `/search/${chatId}`
    
    if (pathname !== chatPath) {
      // Navigate to chat with hash for the section
      router.push(`${chatPath}#section-${queryId}`)
    } else {
      // Already on the chat page, just scroll to the section
      scrollToQuery(queryId)
    }
  }

  const scrollToQuery = (queryId: string) => {
    const element = document.getElementById(`section-${queryId}`)
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
          <span className="ml-2 text-xs text-muted-foreground">Loading queries...</span>
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