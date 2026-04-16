import { dark } from '@clerk/themes'

/**
 * Build Clerk appearance from resolved theme colors.
 * Called server-side in the layout so Clerk gets real hex values,
 * not CSS variables that might not resolve inside its portal.
 *
 * `colorScheme` sets Clerk's baseTheme — variable overrides alone don't
 * switch Clerk out of its default light base.
 */
export function buildClerkAppearance(
  colors: {
    background: string
    foreground: string
    card: string
    border: string
    primary: string
    primaryForeground: string
    muted: string
    mutedForeground: string
    destructive: string
  },
  colorScheme: 'light' | 'dark' = 'light'
): Record<string, unknown> {
  return {
    baseTheme: colorScheme === 'dark' ? dark : undefined,
    layout: {
      animations: true,
      socialButtonsPlacement: 'top'
    },
    variables: {
      colorPrimary: colors.primary,
      colorNeutral: colors.foreground,
      colorBackground: colors.card,
      colorInputBackground: colors.card,
      colorInputText: colors.foreground,
      colorText: colors.foreground,
      colorTextSecondary: colors.mutedForeground,
      colorDanger: colors.destructive,
      borderRadius: '0.5rem',
      fontFamily: 'var(--font-sans)'
    },
    elements: {
      formButtonPrimary: {
        backgroundColor: colors.primary,
        color: colors.primaryForeground,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontWeight: '600'
      },
      card: {
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        boxShadow: 'none'
      },
      input: {
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        color: colors.foreground,
        '::placeholder': {
          color: colors.mutedForeground
        }
      },
      formFieldLabel: {
        color: colors.foreground
      },
      formFieldInput: {
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        color: colors.foreground
      },
      formFieldInput__identifier: {
        color: colors.foreground
      },
      socialButtonsBlockButton: {
        backgroundColor: 'transparent',
        border: `1px solid ${colors.border}`,
        color: colors.foreground
      },
      modalBackdrop: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      modalContent: {
        margin: '0'
      },
      rootBox: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      },
      footer: {
        display: 'none'
      },
      headerTitle: {
        color: colors.foreground,
        fontFamily: 'var(--font-serif)',
        fontSize: '1.5rem'
      },
      headerSubtitle: {
        color: colors.mutedForeground
      },
      dividerLine: {
        backgroundColor: colors.border
      },
      dividerText: {
        color: colors.mutedForeground,
        textTransform: 'uppercase',
        fontSize: '0.75rem',
        letterSpacing: '0.1em'
      }
    }
  }
}
