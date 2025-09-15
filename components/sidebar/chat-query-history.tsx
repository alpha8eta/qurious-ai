'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { MessageCircle } from 'lucide-react'

import { Chat } from '@/lib/types'

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

// Helper function to extract readable text from AI SDK CoreMessage content formats
const getPreviewText = (content: any): string => {
  // Handle string content (simple case)
  if (typeof content === 'string') return content
  
  // Handle array content (CoreMessage format)
  if (Array.isArray(content)) {
    return content
      .map((item: any) => {
        // Handle AI SDK content items with type and text properties
        if (item && typeof item === 'object' && item.type === 'text' && item.text) {
          return item.text
        }
        // Fallback for string items or other text content
        if (typeof item === 'string') return item
        if (item?.text) return item.text
        if (item?.content) return item.content
        return ''
      })
      .filter(Boolean)
      .join(' ')
      .trim()
  }
  
  // Handle object content with direct text property
  if (content && typeof content === 'object') {
    if (typeof content.text === 'string') return content.text
    if (typeof content.content === 'string') return content.content
    // Handle nested array content
    if (Array.isArray(content.content)) return getPreviewText(content.content)
  }
  
  return ''
}

export function ChatQueryHistory({ chatId, isExpanded }: ChatQueryHistoryProps) {
  const [queries, setQueries] = useState<QueryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, setOpenMobile, setOpen } = useSidebar()

  // Track URL changes to show hash in debug info
  useEffect(() => {
    const updateUrl = () => setCurrentUrl(window.location.href)
    updateUrl()
    window.addEventListener('hashchange', updateUrl)
    return () => window.removeEventListener('hashchange', updateUrl)
  }, [])

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

        const chat: Chat = await response.json()
        
        // Extract user queries from messages - use very permissive approach
        const userQueries: QueryItem[] = []
        
        if (chat.messages && Array.isArray(chat.messages)) {
          chat.messages.forEach((message: any, index: number) => {
            // Match user messages with proper role checking
            const isUserMessage = message.role === 'user' || 
                                 message.role === 'human' ||
                                 (typeof message.role === 'string' && message.role.toLowerCase().includes('user'))
            
            if (isUserMessage) {
              // Extract content using improved parsing for AI SDK CoreMessage format
              const content = getPreviewText(message.content)
              
              if (content && content.trim().length > 0) {
                userQueries.push({
                  id: message.id || `query-${index}`,
                  content: content.trim(),
                  timestamp: message.createdAt || message.timestamp ? new Date(message.createdAt || message.timestamp) : undefined
                })
              }
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

    // Close the sidebar before navigation
    if (isMobile) {
      setOpenMobile(false)
    } else {
      setOpen(false)
    }

    const chatPath = `/search/${chatId}`
    const targetUrl = `${chatPath}#section-${queryId}`
    
    console.log('Query clicked - navigating to:', targetUrl)
    
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
      
      {/* Debug URL display to verify hash is set correctly */}
      {process.env.NODE_ENV === 'development' && currentUrl && (
        <div className="mt-2 p-2 text-xs bg-gray-100 dark:bg-gray-800 rounded text-muted-foreground border-t border-sidebar-border/50">
          <div className="font-semibold mb-1">Current URL:</div>
          <div className="break-all">{currentUrl}</div>
        </div>
      )}
    </div>
  )
}