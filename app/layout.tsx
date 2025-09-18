import { Suspense } from 'react'
import type { Metadata, Viewport } from 'next'
import { Inter as FontSans } from 'next/font/google'
import { cookies } from 'next/headers'

import { Analytics } from '@vercel/analytics/next'

import { cn } from '@/lib/utils'

import { SidebarProvider } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'

import AppSidebar from '@/components/app-sidebar'
import ArtifactRoot from '@/components/artifact/artifact-root'
import Header from '@/components/header'
import { ThemeProvider } from '@/components/theme-provider'

import './globals.css'

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans'
})

const title = 'Qurious AI'
const description =
  'A fully open-source AI-powered answer engine with a generative UI.'

export const metadata: Metadata = {
  metadataBase: new URL('https://qurious-ai.vercel.app'),
  title,
  description,
  openGraph: {
    title,
    description
  },
  twitter: {
    title,
    description,
    card: 'summary_large_image',
    creator: '@miiura'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  let user = null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Enable Supabase auth but with safeguards to prevent hanging
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const cookieStore = await cookies()
      const hasSupabaseCookie = cookieStore.getAll().some((c: any) => c.name.startsWith('sb'))
      
      if (hasSupabaseCookie) {
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()
        
        // Check if supabase client is properly initialized
        if (!supabase || !supabase.auth) {
          throw new Error('Supabase client not properly initialized')
        }
        
        const getUserPromise = supabase.auth.getUser()
        
        // Race the auth call against a 1 second timeout
        const result = await Promise.race([
          getUserPromise.then(({ data }: any) => data.user),
          new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('Supabase auth timeout')), 1000)
          )
        ])
        
        user = result
      }
    } catch (error) {
      // If Supabase is unreachable or times out, continue without user
      console.warn('Supabase auth failed:', error)
      user = null
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen flex flex-col font-sans antialiased',
          fontSans.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider defaultOpen>
            <Suspense fallback={<div className="w-64 border-r bg-background" />}>
              <AppSidebar />
            </Suspense>
            <div className="flex flex-col flex-1 min-w-0">
              <Header user={user} />
              <main className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
                <ArtifactRoot>{children}</ArtifactRoot>
              </main>
            </div>
          </SidebarProvider>
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
