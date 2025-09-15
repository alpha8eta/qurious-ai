'use client'

import { useEffect, useMemo, useState } from 'react'

import { ChatRequestOptions, JSONValue, Message } from 'ai'

import { cn } from '@/lib/utils'

import { Spinner } from './ui/spinner'
import { RenderMessage } from './render-message'
import { ToolSection } from './tool-section'

// Import section structure interface
interface ChatSection {
  id: string
  userMessage: Message
  assistantMessages: Message[]
}

interface ChatMessagesProps {
  sections: ChatSection[] // Changed from messages to sections
  data: JSONValue[] | undefined
  onQuerySelect: (query: string) => void
  isLoading: boolean
  chatId: string
  addToolResult?: (params: { toolCallId: string; result: any }) => void
  /** Ref for the scroll container */
  scrollContainerRef: React.RefObject<HTMLDivElement>
  onUpdateMessage?: (messageId: string, newContent: string) => Promise<void>
  reload?: (
    messageId: string,
    options?: ChatRequestOptions
  ) => Promise<string | null | undefined>
}

export function ChatMessages({
  sections,
  data,
  onQuerySelect,
  isLoading,
  chatId,
  addToolResult,
  scrollContainerRef,
  onUpdateMessage,
  reload
}: ChatMessagesProps) {
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({})
  const manualToolCallId = 'manual-tool-call'

  useEffect(() => {
    // Open manual tool call when the last section is a user message
    if (sections.length > 0) {
      const lastSection = sections[sections.length - 1]
      if (lastSection.userMessage.role === 'user') {
        setOpenStates({ [manualToolCallId]: true })
      }
    }
  }, [sections])

  // Handle initial hash navigation when sections are first rendered
  useEffect(() => {
    if (sections.length === 0 || typeof window === 'undefined') return
    
    const handleInitialHashNavigation = () => {
      if (!window.location.hash) return
      
      const hash = window.location.hash.slice(1)
      let element = document.getElementById(hash)
      
      // If direct hash lookup fails, try to find by section index for fallback compatibility
      if (!element && hash.startsWith('section-u-')) {
        const userIndex = parseInt(hash.replace('section-u-', ''))
        if (!isNaN(userIndex)) {
          const allSections = document.querySelectorAll('[id^="section-"]')
          if (allSections[userIndex]) {
            element = allSections[userIndex] as HTMLElement
          }
        }
      }
      
      if (!element) {
        return
      }
      // Delay to ensure elements are rendered and positioned
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        
        // Add highlight effect
        element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50')
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50')
        }, 2000)
      }, 200)
    }

    // Handle initial hash after a short delay to ensure DOM is ready
    const timer = setTimeout(handleInitialHashNavigation, 300)
    return () => clearTimeout(timer)
  }, [sections.length])

  // Handle hashchange events for same-page navigation  
  useEffect(() => {
    const handleHashChange = () => {
      if (typeof window === 'undefined' || !window.location.hash) return
      
      const hash = window.location.hash.slice(1)
      let element = document.getElementById(hash)
      
      // If direct hash lookup fails, try to find by section index for fallback compatibility
      if (!element && hash.startsWith('section-u-')) {
        const userIndex = parseInt(hash.replace('section-u-', ''))
        if (!isNaN(userIndex)) {
          const allSections = document.querySelectorAll('[id^="section-"]')
          if (allSections[userIndex]) {
            element = allSections[userIndex] as HTMLElement
          }
        }
      }
      
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        
        // Add highlight effect
        element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50')
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50')
        }, 2000)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // get last tool data for manual tool call
  const lastToolData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return null

    const lastItem = data[data.length - 1] as {
      type: 'tool_call'
      data: {
        toolCallId: string
        state: 'call' | 'result'
        toolName: string
        args: string
      }
    }

    if (lastItem.type !== 'tool_call') return null

    const toolData = lastItem.data
    return {
      state: 'call' as const,
      toolCallId: toolData.toolCallId,
      toolName: toolData.toolName,
      args: toolData.args ? JSON.parse(toolData.args) : undefined
    }
  }, [data])

  if (!sections.length) return null

  // Get all messages as a flattened array
  const allMessages = sections.flatMap(section => [
    section.userMessage,
    ...section.assistantMessages
  ])

  const lastUserIndex =
    allMessages.length -
    1 -
    [...allMessages].reverse().findIndex(msg => msg.role === 'user')

  // Check if loading indicator should be shown
  const showLoading =
    isLoading &&
    sections.length > 0 &&
    sections[sections.length - 1].assistantMessages.length === 0

  const getIsOpen = (id: string) => {
    if (id.includes('call')) {
      return openStates[id] ?? true
    }
    const baseId = id.endsWith('-related') ? id.slice(0, -8) : id
    const index = allMessages.findIndex(msg => msg.id === baseId)
    return openStates[id] ?? index >= lastUserIndex
  }

  const handleOpenChange = (id: string, open: boolean) => {
    setOpenStates(prev => ({
      ...prev,
      [id]: open
    }))
  }

  return (
    <div
      id="scroll-container"
      ref={scrollContainerRef}
      role="list"
      aria-roledescription="chat messages"
      className={cn(
        'relative size-full pt-14',
        sections.length > 0 ? 'flex-1 overflow-y-auto' : ''
      )}
    >
      <div className="relative mx-auto w-full max-w-3xl px-4">
        {sections.map((section, sectionIndex) => (
          <div
            key={section.id}
            id={`section-${section.id}`}
            className="chat-section mb-8"
            style={
              sectionIndex === sections.length - 1
                ? { minHeight: 'calc(-228px + 100dvh)' }
                : {}
            }
          >
            {/* User message */}
            <div className="flex flex-col gap-4 mb-4">
              <RenderMessage
                message={section.userMessage}
                messageId={section.userMessage.id}
                getIsOpen={getIsOpen}
                onOpenChange={handleOpenChange}
                onQuerySelect={onQuerySelect}
                chatId={chatId}
                addToolResult={addToolResult}
                onUpdateMessage={onUpdateMessage}
                reload={reload}
              />
              {showLoading && <Spinner />}
            </div>

            {/* Assistant messages */}
            {section.assistantMessages.map(assistantMessage => (
              <div key={assistantMessage.id} className="flex flex-col gap-4">
                <RenderMessage
                  message={assistantMessage}
                  messageId={assistantMessage.id}
                  getIsOpen={getIsOpen}
                  onOpenChange={handleOpenChange}
                  onQuerySelect={onQuerySelect}
                  chatId={chatId}
                  addToolResult={addToolResult}
                  onUpdateMessage={onUpdateMessage}
                  reload={reload}
                />
              </div>
            ))}
          </div>
        ))}

        {showLoading && lastToolData && (
          <ToolSection
            key={manualToolCallId}
            tool={lastToolData}
            isOpen={getIsOpen(manualToolCallId)}
            onOpenChange={open => handleOpenChange(manualToolCallId, open)}
            addToolResult={addToolResult}
            chatId={chatId}
          />
        )}
      </div>
    </div>
  )
}
