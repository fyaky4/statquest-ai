import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'StatQuest AI',
  description: 'AI-Powered Gamified Learning for Probability & Statistics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white">
        {children}
      </body>
    </html>
  )
}