'use client'

import { UserButton } from '@atta/auth'

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

export function AttaUserButton() {
  return <UserButton appearance={{ elements: BUTTON_ELEMENTS }} />
}
