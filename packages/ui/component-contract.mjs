/**
 * UI Component Contract
 *
 * Defines every component and type that MUST be exported by every UI library.
 * The validate-ui-contract script enforces this — any library missing an entry
 * here will fail the build.
 *
 * Rules:
 *   - Adding a component to any library → add it here AND implement in all others
 *   - Adding a type to packages/ui/types → add it here
 *   - NEVER remove entries without removing the component from ALL libraries
 */

export const REQUIRED_COMPONENTS = [
  // Shared primitives
  'AgentThinkingText',
  'Flex',
  'Heading',
  'Text',

  // Badge
  'Badge',

  // Button
  'Button',
  'buttonVariants',

  // Card
  'Card',
  'CardContent',
  'CardDescription',
  'CardFooter',
  'CardHeader',
  'CardTitle',

  // Collapsible
  'Collapsible',
  'CollapsibleContent',
  'CollapsibleTrigger',

  // DropdownMenu
  'DropdownMenu',
  'DropdownMenuCheckboxItem',
  'DropdownMenuContent',
  'DropdownMenuGroup',
  'DropdownMenuItem',
  'DropdownMenuLabel',
  'DropdownMenuPortal',
  'DropdownMenuRadioGroup',
  'DropdownMenuRadioItem',
  'DropdownMenuSeparator',
  'DropdownMenuShortcut',
  'DropdownMenuSub',
  'DropdownMenuSubContent',
  'DropdownMenuSubTrigger',
  'DropdownMenuTrigger',

  // Form
  'Input',
  'Textarea',

  // Layout
  'Separator',

  // Toast
  'Toast',
  'ToastProvider',
  'useToastContext',

  // Sidebar
  'Sidebar',
  'SidebarContent',
  'SidebarFooter',
  'SidebarGroup',
  'SidebarGroupAction',
  'SidebarGroupContent',
  'SidebarGroupLabel',
  'SidebarHeader',
  'SidebarInput',
  'SidebarInset',
  'SidebarMenu',
  'SidebarMenuAction',
  'SidebarMenuBadge',
  'SidebarMenuButton',
  'SidebarMenuItem',
  'SidebarMenuSkeleton',
  'SidebarMenuSub',
  'SidebarMenuSubButton',
  'SidebarMenuSubItem',
  'SidebarProvider',
  'SidebarRail',
  'SidebarSeparator',
  'SidebarTrigger',
  'useSidebar',
]

export const REQUIRED_TYPES = [
  // Button
  'ButtonProps',
  'ButtonSize',
  'ButtonVariant',
  'ButtonVariantsFn',

  // Badge
  'BadgeAnimation',
  'BadgeProps',
  'BadgeShape',
  'BadgeSize',
  'BadgeVariant',

  // Card
  'CardActionProps',
  'CardContentProps',
  'CardDescriptionProps',
  'CardFooterProps',
  'CardHeaderProps',
  'CardProps',
  'CardTitleProps',

  // Form — Input
  'InputBlockProps',
  'InputProps',
  'InputSize',
  'InputVariant',

  // Form — Textarea
  'TextareaProps',
  'TextareaSize',
  'TextareaVariant',

  // Layout — Flex
  'FlexAlign',
  'FlexDirection',
  'FlexJustify',
  'FlexProps',
  'FlexWrap',

  // Layout — Separator
  'SeparatorOrientation',
  'SeparatorProps',

  // Typography — Heading
  'HeadingLevel',
  'HeadingProps',
  'HeadingSize',

  // Typography — Text
  'TextAs',
  'TextProps',
  'TextSize',
  'TextWeight',

  // Toast
  'ToastContextType',
  'ToastData',
  'ToastPosition',
  'ToastProps',
  'ToastProviderProps',
  'ToastType',
]

export const TEMPLATES = ['basic', 'retro', 'animate', 'brutal']
