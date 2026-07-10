import { redirect } from 'next/navigation'

// Web signup is retired — Skoolie lives in the mobile app. Send visitors to the landing page.
export default function SignupPage() {
  redirect('/')
}
