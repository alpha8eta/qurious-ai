import { ChangelogBanner } from '@/components/changelog-banner'
import { Chat } from '@/components/chat'
import { generateId } from '@/lib/db/schema'

// Force dynamic rendering to prevent static pre-render with single ID
export const dynamic = 'force-dynamic'

export default async function Page() {
  // Generate a unique ID for each new chat to prevent database conflicts
  // This ensures each user gets a unique chat session
  const id = generateId()
  return (
    <>
      <Chat id={id} />
      <ChangelogBanner />
    </>
  )
}
