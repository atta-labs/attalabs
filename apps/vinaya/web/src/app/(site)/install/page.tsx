import { permanentRedirect } from 'next/navigation'

export default function InstallRedirect() {
  permanentRedirect('/cli')
}
