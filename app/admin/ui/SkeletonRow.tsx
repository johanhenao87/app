'use client'

export default function SkeletonRow({ cols = 8 }: { cols?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, index) => (
        <td key={index} className="px-3 py-2">
          <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
        </td>
      ))}
    </tr>
  )
}
