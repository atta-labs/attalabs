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

  // Tabs
  'Tabs',
  'TabsContent',
  'TabsList',
  'TabsTrigger',

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
