import { CoreMessage, DataStreamWriter, JSONValue, Message } from 'ai'

import { getChat, saveChat } from '@/lib/actions/chat'
import { generateRelatedQuestions } from '@/lib/agents/generate-related-questions'
import { ExtendedCoreMessage } from '@/lib/types'
import { convertToExtendedCoreMessages } from '@/lib/utils'

interface HandleStreamFinishParams {
  responseMessages: CoreMessage[]
  originalMessages: Message[]
  model: string
  chatId: string
  dataStream: DataStreamWriter
  userId: string
  skipRelatedQuestions?: boolean
  annotations?: ExtendedCoreMessage[]
}

export async function handleStreamFinish({
  responseMessages,
  originalMessages,
  model,
  chatId,
  dataStream,
  userId,
  skipRelatedQuestions = false,
  annotations = []
}: HandleStreamFinishParams) {
  try {
    const extendedCoreMessages = convertToExtendedCoreMessages(originalMessages)
    let allAnnotations = [...annotations]

    if (!skipRelatedQuestions) {
      try {
        // Notify related questions loading
        const relatedQuestionsAnnotation: JSONValue = {
          type: 'related-questions',
          data: { items: [] }
        }
        dataStream.writeMessageAnnotation(relatedQuestionsAnnotation)

        // Generate related questions
        const relatedQuestions = await generateRelatedQuestions(
          responseMessages,
          model
        )

        // Create and add related questions annotation
        const updatedRelatedQuestionsAnnotation: ExtendedCoreMessage = {
          role: 'data',
          content: {
            type: 'related-questions',
            data: relatedQuestions.object
          } as JSONValue
        }

        dataStream.writeMessageAnnotation(
          updatedRelatedQuestionsAnnotation.content as JSONValue
        )
        allAnnotations.push(updatedRelatedQuestionsAnnotation)
      } catch (error) {
        console.error('Failed to generate related questions:', error)
        // Continue with chat saving even if related questions fail
        // Send empty related questions as fallback
        const fallbackAnnotation: JSONValue = {
          type: 'related-questions',
          data: { items: [] }
        }
        dataStream.writeMessageAnnotation(fallbackAnnotation)
      }
    }

    // Create the message to save
    const generatedMessages = [
      ...extendedCoreMessages,
      ...responseMessages.slice(0, -1),
      ...allAnnotations, // Add annotations before the last message
      ...responseMessages.slice(-1)
    ] as ExtendedCoreMessage[]

    // Always enable chat history saving in development
    // if (process.env.ENABLE_SAVE_CHAT_HISTORY !== 'true') {
    //   return
    // }

    // Get the chat from the database if it exists, otherwise create a new one
    const now = new Date()
    const savedChat = (await getChat(chatId, userId)) ?? {
      messages: [],
      createdAt: now,
      userId: userId,
      path: `/search/${chatId}`,
      title: originalMessages[0].content,
      id: chatId,
      // Threading fields - defaults for new root chats
      parentId: null,
      rootId: chatId,
      depth: 0,
      childrenCount: 0,
      lastActivityAt: now,
      updatedAt: now
    }

    // Save chat with complete response and related questions
    await saveChat(
      {
        ...savedChat,
        messages: generatedMessages,
        // Update timestamps on save
        lastActivityAt: now,
        updatedAt: now
      },
      userId
    ).catch(error => {
      console.error('Failed to save chat:', error)
      throw new Error('Failed to save chat history')
    })
  } catch (error) {
    console.error('Error in handleStreamFinish:', error)
    throw error
  }
}
