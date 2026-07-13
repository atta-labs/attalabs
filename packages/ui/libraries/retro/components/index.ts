// Types
export type * from '../../../types'

// Display
export { Badge } from '../installed/badge'

// Interactive — Collapsible
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../installed/collapsible'

// Interactive — Tabs (flat upstream exports — no adapter needed)
export { Tabs, TabsContent, TabsList, TabsTrigger } from '../installed/tabs'

// Interactive — DropdownMenu
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '../installed/dropdown-menu'
// DropdownMenuItemTextHighlight — native retro (wraps retro's own DropdownMenuItem)
export {
  DropdownMenuItemTextHighlight,
  type DropdownMenuItemTextHighlightProps
} from './interactive/dropdown-menu-item-text-highlight'

// Interactive — Popover
export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '../installed/popover'

// Interactive — Select
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from './form/select'

// Command — native retro (Radix flavor)
export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from '../installed/command'

// Form
export { Input, InputBlock } from './form/input'
export { Checkbox } from './form/checkbox'
export { Textarea } from './form/textarea'
export { Slider } from '../installed/slider'

// Model — falls back to basic
export { ModelIcon, type ModelIconProps } from '../../basic/components/model/model-icon'
export {
  ModelPicker,
  type ModelPickerProps,
  type ModelPickerValue
} from '../../basic/components/model/model-picker'

// Layout
export { Separator } from '../installed/separator'

// Content — Table
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from '../installed/table'

// Shared
export { AgentThinkingText, Flex, Heading, Text } from '../../shared'

// Interactive — Button
export { Button, buttonVariants } from './interactive/button'

// Content — Card (native retro upstream ships CardAction)
export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../installed/card'

// Display — Toast (native retro card built on retroui's Alert)
export { Toast } from './display/toast'
export { ToastProvider, useToastContext } from './display/toast-provider'

// Sidebar — native retro (Radix flavor)
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar
} from '../installed/sidebar'

// Sheet — native retro (Radix flavor)
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '../installed/sheet'

// Dialog — native retro (Radix flavor)
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger
} from '../installed/dialog'

// Text Reveal
export { TextReveal } from '../../../text-reveal'
export type { TextRevealProps } from '../../../text-reveal'
