import { cookies } from 'next/headers'

import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { createManualToolStreamResponse } from '@/lib/streaming/create-manual-tool-stream'
import { createToolCallingStreamResponse } from '@/lib/streaming/create-tool-calling-stream'
import { Model } from '@/lib/types/models'
import { isProviderEnabled } from '@/lib/utils/registry'

export const maxDuration = 30

const DEFAULT_MODEL: Model = {
  id: 'gpt-4o-mini',
  name: 'GPT-4o mini',
  provider: 'OpenAI',
  providerId: 'openai',
  enabled: true,
  toolCallType: 'native'
}

export async function POST(req: Request) {
  try {
    console.log('=== API CHAT DEBUG ===')
    console.log('Request URL:', req.url)
    console.log('Request method:', req.method)
    console.log('Content-Type:', req.headers.get('content-type'))
    console.log('Request body size:', req.headers.get('content-length'))
    
    const bodyText = await req.text()
    console.log('Raw body:', bodyText)
    console.log('Body length:', bodyText.length)
    
    if (!bodyText || bodyText.trim() === '') {
      console.error('Empty request body received')
      return new Response('Empty request body', {
        status: 400,
        statusText: 'Bad Request'
      })
    }
    
    let parsedBody
    try {
      parsedBody = JSON.parse(bodyText)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Body that failed to parse:', bodyText)
      return new Response('Invalid JSON in request body', {
        status: 400,
        statusText: 'Bad Request'
      })
    }
    
    const { messages, id: chatId } = parsedBody
    const referer = req.headers.get('referer')
    const isSharePage = referer?.includes('/share/')
    const userId = await getCurrentUserId()

    if (isSharePage) {
      return new Response('Chat API is not available on share pages', {
        status: 403,
        statusText: 'Forbidden'
      })
    }

    const cookieStore = await cookies()
    const modelJson = cookieStore.get('selectedModel')?.value
    const searchMode = cookieStore.get('search-mode')?.value === 'true'

    let selectedModel = DEFAULT_MODEL

    if (modelJson) {
      try {
        selectedModel = JSON.parse(modelJson) as Model
      } catch (e) {
        console.error('Failed to parse selected model:', e)
      }
    }

    if (
      !isProviderEnabled(selectedModel.providerId) ||
      selectedModel.enabled === false
    ) {
      return new Response(
        `Selected provider is not enabled ${selectedModel.providerId}`,
        {
          status: 404,
          statusText: 'Not Found'
        }
      )
    }

    const supportsToolCalling = selectedModel.toolCallType === 'native'

    return supportsToolCalling
      ? createToolCallingStreamResponse({
          messages,
          model: selectedModel,
          chatId,
          searchMode,
          userId
        })
      : createManualToolStreamResponse({
          messages,
          model: selectedModel,
          chatId,
          searchMode,
          userId
        })
  } catch (error) {
    console.error('API route error:', error)
    return new Response('Error processing your request', {
      status: 500,
      statusText: 'Internal Server Error'
    })
  }
}
