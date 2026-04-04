/**
 * Herald UI Component Contract
 *
 * All libraries (basic, retro, animate, brutal) must export these components and types.
 * Run `bun run validate:ui-contract` to verify.
 */

export const REQUIRED_COMPONENTS = [
  // Interactive
  'Button',
  'buttonVariants',
  // Content
  'Card',
  'CardHeader',
  'CardTitle',
  'CardDescription',
  'CardContent',
  'CardFooter',
  // Form
  'Input',
  'Textarea',
  // Display
  'Badge',
  // Layout
  'Separator',
  'Flex',
  // Typography
  'Heading',
  'Text'
]

export const REQUIRED_TYPES = [
  'ButtonProps',
  'ButtonVariant',
  'ButtonSize',
  'ButtonVariantsFn',
  'CardProps',
  'CardHeaderProps',
  'CardTitleProps',
  'CardDescriptionProps',
  'CardContentProps',
  'CardFooterProps',
  'InputProps',
  'TextareaProps',
  'BadgeProps',
  'BadgeVariant',
  'SeparatorProps',
  'FlexProps',
  'FlexDirection',
  'FlexAlign',
  'FlexJustify',
  'FlexWrap',
  'HeadingProps',
  'HeadingLevel',
  'HeadingSize',
  'TextProps',
  'TextAs',
  'TextSize',
  'TextWeight'
]

export const TEMPLATES = ['basic', 'retro', 'animate', 'brutal']
