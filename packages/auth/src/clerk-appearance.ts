import { dark } from '@clerk/themes'

/**
 * Build Clerk appearance from resolved theme colors.
 * Called server-side in the layout so Clerk gets real computed values,
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
  colorScheme: 'light' | 'dark' = 'light',
  fontSans?: string,
  radius?: string
): Record<string, unknown> {
  const borderRadius = radius ?? '0.5rem'
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
      borderRadius,
      ...(fontSans ? { fontFamily: fontSans } : {})
    },
    elements: {
      rootBox: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: 'none'
      },
      card: {
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        boxShadow: 'none'
      },
      modalBackdrop: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      modalContent: {
        margin: '0',
        boxShadow: 'none'
      },
      headerTitle: {
        color: colors.foreground,
        fontFamily: 'var(--font-serif)',
        fontSize: '1.5rem'
      },
      headerSubtitle: {
        color: colors.mutedForeground
      },
      formButtonPrimary: {
        backgroundColor: colors.primary,
        color: colors.primaryForeground,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontWeight: '600',
        borderRadius
      },
      formButtonSecondary: {
        backgroundColor: 'transparent',
        border: `1px solid ${colors.border}`,
        color: colors.foreground
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
      formFieldAction: {
        color: colors.primary
      },
      input: {
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        color: colors.foreground,
        '::placeholder': {
          color: colors.mutedForeground
        }
      },
      otpCodeFieldInput: {
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        color: colors.foreground
      },
      socialButtonsBlockButton: {
        backgroundColor: 'transparent',
        border: `1px solid ${colors.border}`,
        color: colors.foreground
      },
      alternativeMethodsBlockButton: {
        backgroundColor: 'transparent',
        border: `1px solid ${colors.border}`,
        color: colors.foreground
      },
      selectButton: {
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        color: colors.foreground
      },
      selectOptionsContainer: {
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        boxShadow: 'none'
      },
      backLink: {
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
      },
      badge: {
        color: colors.mutedForeground,
        backgroundColor: colors.muted
      },
      footer: {
        display: 'none'
      }
    }
  }
}
