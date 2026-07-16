// Interactive — animate has its own motion-enhanced button

// Types
export type * from '../../../types'
// Display — motion badge
export { Badge } from '../installed/badge'
// Content — motion card
export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '../installed/card'
// Form — falls back to basic
export { Input, InputBlock } from './form/input'
export { Checkbox } from './form/checkbox'
// Layout
export { Separator } from '../../basic/installed/separator'
// Navigation — falls back to basic
export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '../../basic/installed/breadcrumb'
// Form — falls back to basic
export { Slider } from '../../basic/installed/slider'
// Table
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
export { Textarea } from './form/textarea'

// Shared
export { AgentThinkingText, Flex, Heading, Text } from '../../shared'
export { Button, buttonVariants } from './interactive/button'
// Display — falls back to basic for Toast
export { Toast, ToastProvider, useToastContext } from '../../basic/components/display/toast'
export { Collapsible, CollapsibleContent, CollapsibleTrigger, useCollapsible } from '../installed/collapsible'
// Interactive — Tabs (animated indicator + content transition)
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
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
export {
  DropdownMenuItemTextHighlight,
  type DropdownMenuItemTextHighlightProps
} from './interactive/dropdown-menu-item-text-highlight'
export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '../installed/popover'
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
} from '../installed/select'
export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from '../../basic/installed/command'
// Model
export { ModelIcon, type ModelIconProps } from '../../basic/components/model/model-icon'
export {
  ModelPicker,
  type ModelPickerProps,
  type ModelPickerValue
} from '../../basic/components/model/model-picker'
// Sidebar — falls back to basic
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
} from '../../basic/installed/sidebar'
// Sheet — falls back to basic
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '../../basic/components/overlay/sheet'
// Dialog — falls back to basic
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
} from '../../basic/installed/dialog'

// Text Reveal
export { TextReveal } from '../../../text-reveal'
export type { TextRevealProps } from '../../../text-reveal'
