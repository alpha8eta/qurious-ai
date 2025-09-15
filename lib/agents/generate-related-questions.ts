import { CoreMessage, generateObject } from 'ai'

import { relatedSchema } from '@/lib/schema/related'

import {
  getModel,
  getToolCallModel,
  isToolCallSupported
} from '../utils/registry'

export async function generateRelatedQuestions(
  messages: CoreMessage[],
  model: string
) {
  const lastMessages = messages.slice(-1).map(message => ({
    ...message,
    role: 'user'
  })) as CoreMessage[]

  const supportedModel = isToolCallSupported(model)
  const currentModel = supportedModel
    ? getModel(model)
    : getToolCallModel(model)

  const result = await generateObject({
    model: currentModel,
    system: `As a professional web researcher, your task is to generate a set of exactly three queries that explore the subject matter more deeply, building upon the initial query and the information uncovered in its search results.

    For instance, if the original query was "Starship's third test flight key milestones", your output should follow this format:
    {
      "items": [
        {"query": "What were the technical achievements of SpaceX Starship's third test flight?"},
        {"query": "How does Starship's third flight performance compare to previous test flights?"},
        {"query": "What are the next planned milestones for SpaceX Starship development?"}
      ]
    }

    IMPORTANT: You must generate exactly three related questions. Each question should:
    1. Build upon the original query
    2. Explore different aspects (technical, comparative, future implications)
    3. Be specific and actionable for web research
    
    Aim to create queries that progressively delve into more specific aspects, implications, or adjacent topics related to the initial query. The goal is to anticipate the user's potential information needs and guide them towards a more comprehensive understanding of the subject matter.
    Please match the language of the response to the user's language.`,
    messages: lastMessages,
    schema: relatedSchema
  })

  return result
}
