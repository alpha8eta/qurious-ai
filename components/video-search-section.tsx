'use client'

import { useChat } from '@ai-sdk/react'
import { UIToolInvocation } from 'ai'

import type { SerperSearchResults } from '@/lib/types'

import { useArtifact } from '@/components/artifact/artifact-context'

import { CollapsibleMessage } from './collapsible-message'
import { DefaultSkeleton } from './default-skeleton'
import { Section, ToolArgsSection } from './section'
import { VideoSearchResults } from './video-search-results'

interface VideoSearchSectionProps {
  tool: UIToolInvocation<any>
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  chatId: string
}

export function VideoSearchSection({
  tool,
  isOpen,
  onOpenChange,
  chatId
}: VideoSearchSectionProps) {
  const { status } = useChat({
    id: chatId
  })
  const isLoading = status === 'submitted' || status === 'streaming'

  // Temporary type-safe access to tool properties
  const isToolLoading = (tool as any).state === 'call'
  const videoResults: SerperSearchResults =
    (tool as any).state === 'result' ? (tool as any).output : undefined
  const query = (tool as any).input?.query as string | undefined

  const header = (
    <div className="flex items-center justify-between w-full text-left rounded-md p-1 -ml-1">
      <ToolArgsSection tool="videoSearch" number={videoResults?.videos?.length}>
        Video Search
      </ToolArgsSection>
    </div>
  )

  return (
    <CollapsibleMessage
      role="assistant"
      isCollapsible={true}
      header={header}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      showIcon={false}
    >
      {!isLoading && videoResults ? (
        <Section title="Videos">
          <VideoSearchResults results={videoResults} />
        </Section>
      ) : (
        <DefaultSkeleton />
      )}
    </CollapsibleMessage>
  )
}
