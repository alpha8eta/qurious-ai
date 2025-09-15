# replit.md

## Overview

Qurious AI is an AI-powered search engine with a generative UI built on Next.js. The application provides intelligent search capabilities with multiple providers (Tavily, SearXNG, Exa) and presents results through AI-generated interfaces. Users can interact with different AI models, view detailed search results, and manage chat history with optional authentication through Supabase.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Next.js 15.2.3** with App Router and React Server Components for server-side rendering and modern React patterns
- **TypeScript** throughout the application for type safety and better development experience
- **Tailwind CSS** with shadcn/ui components for consistent, responsive UI design
- **React 19.0.0** leveraging the latest React features and concurrent rendering

### Backend Architecture
- **API Routes** in `/app/api/` handle chat interactions, search requests, and authentication endpoints
- **Vercel AI SDK 4.3.6** manages AI streaming, tool calling, and GenerativeUI components
- **Server Actions** for database operations and server-side mutations
- **Middleware** handles session management and request routing with Supabase integration

### AI Integration
- **Multi-provider support** with configurable AI models (OpenAI, Google, Anthropic, Azure OpenAI, Ollama, etc.)
- **Tool-based architecture** in `/lib/tools/` for search, retrieval, and video search capabilities
- **Agent system** in `/lib/agents/` for research tasks and question generation
- **Streaming responses** with real-time UI updates during AI processing
- **Reasoning models** with visible thought processes for transparent AI decision-making

### Data Architecture
- **Optional Supabase integration** for user authentication (email/password, social login with Google)
- **Redis storage** (Upstash or local) for chat history persistence when enabled
- **File-based configuration** for AI models in `public/config/models.json`
- **Cookie-based preferences** for model selection and search mode toggles

### Component Architecture
- **Artifact system** for displaying detailed search results and tool outputs in resizable panels
- **Collapsible message structure** for organizing chat conversations
- **Tool sections** for different search types (web, video, document retrieval)
- **Responsive design** with mobile drawer and desktop panel layouts

### Search System
- **Multiple search providers** with fallback capabilities:
  - Tavily (default web search)
  - SearXNG (self-hosted search)
  - Exa (neural search)
  - Serper API (video search)
- **Content retrieval** from URLs with summarization
- **Image and video search** with carousel displays

## External Dependencies

### Core Infrastructure
- **Vercel** for deployment and hosting (production environment)
- **Supabase** for authentication services and user management
- **Upstash Redis** or local Redis for chat history storage

### AI Services
- **OpenAI API** (default AI provider)
- **Google Generative AI** (Gemini models)
- **Anthropic** (Claude models)
- **Azure OpenAI** (enterprise OpenAI access)
- **Other providers**: Groq, Fireworks, DeepSeek, xAI

### Search APIs
- **Tavily API** (primary web search provider)
- **SearXNG** (optional self-hosted search)
- **Exa API** (neural search capabilities)
- **Serper API** (video search functionality)

### Development Tools
- **ESLint** with custom import sorting rules
- **Prettier** for code formatting
- **TypeScript** compiler for type checking
- **Bun** as the package manager and development server

### UI Libraries
- **Radix UI** primitives for accessible component foundations
- **Lucide React** for consistent iconography
- **React Icons** for additional icon sets
- **Embla Carousel** for media galleries
- **Sonner** for toast notifications