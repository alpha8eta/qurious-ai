import { ChangelogBanner } from '@/components/changelog-banner'
import { Chat } from '@/components/chat'

export default async function Page() {
  // Use a consistent ID for new chats that won't cause hydration mismatch
  // The Chat component will handle ID generation internally when needed
  const id = 'new-chat'
  return (
    <>
      <Chat id={id} />
      <ChangelogBanner />
    </>
  )
}
