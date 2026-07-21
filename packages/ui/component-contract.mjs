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

  // Code — hand-written in each library's wrapper layer (shadcn ships no code
  // component, so `installed/` has no canonical to paste; D-065)
  'Code',
  'CodeBlock',

  // Collapsible
  'Collapsible',
  'CollapsibleContent',
  'CollapsibleTrigger',

  // Tabs
  'Tabs',
  'TabsContent',
  'TabsList',
  'TabsTrigger',

  // Toggle
  'Toggle',
  'toggleVariants',

  // DropdownMenu
  'DropdownMenu',
  'DropdownMenuCheckboxItem',
  'DropdownMenuContent',
  'DropdownMenuGroup',
  'DropdownMenuItem',
  'DropdownMenuItemTextHighlight',
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

  // Popover
  'Popover',
  'PopoverAnchor',
  'PopoverContent',
  'PopoverTrigger',

  // Command
  'Command',
  'CommandEmpty',
  'CommandGroup',
  'CommandInput',
  'CommandItem',
  'CommandList',
  'CommandSeparator',
  'CommandShortcut',

  // Model
  'ModelIcon',
  'ModelPicker',

  // Form
  'Input',
  'Textarea',
  'Slider',
  'Checkbox',

  // Select
  'Select',
  'SelectContent',
  'SelectGroup',
  'SelectItem',
  'SelectLabel',
  'SelectScrollDownButton',
  'SelectScrollUpButton',
  'SelectSeparator',
  'SelectTrigger',
  'SelectValue',

  // Layout
  'Separator',

  // Navigation
  'Breadcrumb',
  'BreadcrumbEllipsis',
  'BreadcrumbItem',
  'BreadcrumbLink',
  'BreadcrumbList',
  'BreadcrumbPage',
  'BreadcrumbSeparator',

  // Table
  'Table',
  'TableBody',
  'TableCaption',
  'TableCell',
  'TableFooter',
  'TableHead',
  'TableHeader',
  'TableRow',

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

  // Sheet
  'Sheet',
  'SheetClose',
  'SheetContent',
  'SheetDescription',
  'SheetFooter',
  'SheetHeader',
  'SheetTitle',
  'SheetTrigger',

  // Dialog
  'Dialog',
  'DialogClose',
  'DialogContent',
  'DialogDescription',
  'DialogFooter',
  'DialogHeader',
  'DialogOverlay',
  'DialogPortal',
  'DialogTitle',
  'DialogTrigger',

  // Text Reveal
  'TextReveal',
]

export const REQUIRED_TYPES = [
  // Button — only `Button` itself is contracted across libraries. The cross-
  // library variant/size enums were removed because they had zero consumer
  // usage and forced every library to extend its canonical with bespoke
  // names. Each library's installed/ now derives its own ButtonProps from
  // its own cva (`VariantProps<typeof buttonVariants>`).

  // Tabs
  'TabsContentProps',
  'TabsListProps',
  'TabsProps',
  'TabsTriggerProps',

  // Toggle — like Button, each library derives ToggleProps from its OWN
  // installed cva (variant/size enums diverge by design); only the NAME is
  // contracted, so there is no shared types/interactive/toggle.ts.
  'ToggleProps',

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

  // Code
  'CodeProps',
  'CodeBlockProps',

  // Form — Input
  'InputBlockProps',
  'InputProps',
  'InputSize',
  'InputVariant',

  // Form — Textarea
  'TextareaProps',
  'TextareaSize',
  'TextareaVariant',

  // Form — Slider
  'SliderProps',

  // Form — Checkbox
  'CheckboxProps',
  'CheckedState',

  // Layout — Flex
  'FlexAlign',
  'FlexDirection',
  'FlexJustify',
  'FlexProps',
  'FlexWrap',

  // Layout — Separator
  'SeparatorOrientation',
  'SeparatorProps',

  // Navigation — Breadcrumb
  'BreadcrumbProps',
  'BreadcrumbListProps',
  'BreadcrumbItemProps',
  'BreadcrumbLinkProps',
  'BreadcrumbPageProps',
  'BreadcrumbSeparatorProps',
  'BreadcrumbEllipsisProps',

  // Typography — Heading
  'HeadingLevel',
  'HeadingProps',
  'HeadingSize',
  'HeadingWeight',

  // Typography — Text
  'TextAs',
  'TextProps',
  'TextSize',
  'TextWeight',

  // Model
  'ModelIconProps',
  'ModelPickerProps',
  'ModelPickerValue',

  // Toast
  'ToastContextType',
  'ToastData',
  'ToastPosition',
  'ToastProps',
  'ToastProviderProps',
  'ToastType',

  // Text Reveal
  'TextRevealProps',
]

export const TEMPLATES = ['basic', 'retro', 'animate', 'brutal']
