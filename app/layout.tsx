import './globals.css'
import { Providers } from './providers'
import ErrorBoundary from './components/ErrorBoundary'
import { Toaster } from 'react-hot-toast'
import { Suspense } from 'react'
import { ThemeProvider } from './context/ThemeContext'

export const metadata = {
  title: 'Sharki | Home of NFTs',
  description: 'Home of NFTs on the Monad network',
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-zinc-950 text-white">
        <ThemeProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <Providers>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </Providers>
          </Suspense>
          <Toaster 
            position="bottom-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: 'rgba(24,24,27,0.95)',
                border: '1px solid rgba(63,63,70,0.8)',
                color: '#fff',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '10px 12px',
                fontFamily: 'var(--font-sf-pro)',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#0a0a0a',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#0a0a0a',
                },
              },
              loading: {
                iconTheme: {
                  primary: '#3b82f6',
                  secondary: '#0a0a0a',
                },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
