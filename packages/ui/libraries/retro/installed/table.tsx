import { cn } from '../../../lib/utils'
import type * as React from 'react'

function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className='relative w-full overflow-auto'>
      <table
        className={cn(
          'w-full caption-bottom text-sm border-2 border-border shadow-[4px_4px_0px_0px_var(--border)]',
          className
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('[&_tr]:border-b bg-primary text-primary-foreground font-semibold', className)} {...props} />
  )
}

function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

function TableFooter({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={cn('border-t border-border bg-accent font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-border transition-colors hover:bg-primary/20 data-[state=selected]:bg-muted',
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-10 px-4 text-left align-middle font-medium text-primary-foreground [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('p-3 align-middle [&:has([role=checkbox])]:pr-0', className)} {...props} />
}

function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={cn('mt-2 text-sm text-muted-foreground', className)} {...props} />
}

export { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption }
