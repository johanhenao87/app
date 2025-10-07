'use client'

import React from 'react'

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { as?: 'button' }
const base = 'px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition'

export function PrimaryButton(props: BtnProps) {
  const { className, ...rest } = props
  return <button className={`${base} bg-indigo-600 hover:bg-indigo-700 text-white ${className||''}`} {...rest} />
}
export function SuccessButton(props: BtnProps) {
  const { className, ...rest } = props
  return <button className={`${base} bg-emerald-600 hover:bg-emerald-700 text-white ${className||''}`} {...rest} />
}
export function SkyButton(props: BtnProps) {
  const { className, ...rest } = props
  return <button className={`${base} bg-sky-600 hover:bg-sky-700 text-white ${className||''}`} {...rest} />
}
export function DangerButton(props: BtnProps) {
  const { className, ...rest } = props
  return <button className={`${base} bg-rose-600 hover:bg-rose-700 text-white ${className||''}`} {...rest} />
}
export function SecondaryButton(props: BtnProps) {
  const { className, ...rest } = props
  return <button className={`${base} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 ${className||''}`} {...rest} />
}
export function IconButton({ className, ...rest }: BtnProps) {
  return (
    <button
      className={`w-10 h-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-lg ${className||''}`}
      {...rest}
    />
  )
}
