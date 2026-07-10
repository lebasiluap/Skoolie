import { redirect } from 'next/navigation'

// Web login is retired — Skoolie lives in the mobile app. Send visitors to the landing page.
export default function LoginPage() {
  redirect('/')
}
