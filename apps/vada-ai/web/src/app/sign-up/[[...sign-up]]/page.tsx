import { redirect } from 'next/navigation'

export default function SignUpPage() {
  redirect('/?signup=1')
}
