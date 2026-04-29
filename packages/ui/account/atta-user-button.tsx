'use client'

import { UserButton } from '@atta/auth'

interface AttaUserButtonProps {
  afterSignOutUrl?: string
}

const BUTTON_ELEMENTS = {
  userButtonAvatarBox: {
    width: '1.5rem',
    height: '1.5rem'
  },
  userButtonPopoverCard: {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    boxShadow: 'none'
  },
  userButtonPopoverActionButton: {
    color: 'var(--foreground)'
  },
  userButtonPopoverActionButtonIcon: {
    color: 'var(--muted-foreground)'
  },
  userButtonPopoverFooter: {
    display: 'none'
  }
}

export function AttaUserButton({ afterSignOutUrl = '/' }: AttaUserButtonProps) {
  return <UserButton afterSignOutUrl={afterSignOutUrl} appearance={{ elements: BUTTON_ELEMENTS }} />
}
