/** @category content */
import type * as React from 'react'

/**
 * Card component props contract.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

/**
 * CardHeader component props contract.
 */
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

/**
 * CardTitle component props contract.
 */
export interface CardTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

/**
 * CardDescription component props contract.
 */
export interface CardDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

/**
 * CardAction component props contract.
 */
export interface CardActionProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

/**
 * CardContent component props contract.
 */
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

/**
 * CardFooter component props contract.
 */
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}
