import { ProfileEditor } from '@/components/portal/ProfileEditor'
import { DANI_PROFILE } from '@/lib/profile'

export default function AdminPage() {
  return (
    <div className='mx-auto max-w-[900px] px-6 py-8'>
      <header className='mb-8'>
        <h1 className='font-display text-2xl tracking-tight'>Dashboard</h1>
        <p className='mt-1 font-mono text-xs text-muted'>Edit your profile and manage your Envoy</p>
      </header>

      <ProfileEditor profile={DANI_PROFILE} />
    </div>
  )
}
