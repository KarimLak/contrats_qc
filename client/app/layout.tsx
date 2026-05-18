import { AuthProvider } from "./context/AuthContext"
import { ReactNode } from "react"

export const metadata = { title: "auth_v2" }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}