'use client'

import { UserButton } from '@atta/auth'
import { LayoutDashboard, Settings } from 'lucide-react'

export function HeraldUserButton() {
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link label='Dashboard' labelIcon={<LayoutDashboard className='h-4 w-4' />} href='/candidate' />
        <UserButton.Link label='Settings' labelIcon={<Settings className='h-4 w-4' />} href='/candidate/settings' />
      </UserButton.MenuItems>
    </UserButton>
  )
}
