'use client'

import React from 'react'

export type ButtonVariant =
  | 'primary'
  | 'success'
  | 'sky'
  | 'danger'
  | 'secondary'
  | 'icon'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Exclude<ButtonVariant, 'icon'>
}

const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-offset-slate-950'

function compose(variant: ButtonVariant, className?: string) {
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    sky: 'bg-sky-600 text-white hover:bg-sky-700',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    secondary:
      'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
    icon:
      'h-10 w-10 border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
  }
  const extra = className ? ` ${className}` : ''
  return `${base} ${styles[variant]}${extra}`.trim()
}

export function PrimaryButton({ className, ...rest }: ButtonProps) {
  return <button className={compose('primary', className)} {...rest} />
}

export function SuccessButton({ className, ...rest }: ButtonProps) {
  return <button className={compose('success', className)} {...rest} />
}

export function SkyButton({ className, ...rest }: ButtonProps) {
  return <button className={compose('sky', className)} {...rest} />
}

export function DangerButton({ className, ...rest }: ButtonProps) {
  return <button className={compose('danger', className)} {...rest} />
}

export function SecondaryButton({ className, ...rest }: ButtonProps) {
  return <button className={compose('secondary', className)} {...rest} />
}

export function IconButton({ className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={compose('icon', className)} {...rest} />
}
