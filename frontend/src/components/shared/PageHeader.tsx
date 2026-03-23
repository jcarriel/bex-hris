import React from 'react'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title?: string
  description?: string
  breadcrumb?: BreadcrumbItem[]
  actions?: React.ReactNode
}

export function PageHeader({ title, description, breadcrumb, actions }: PageHeaderProps) {
  if (!title && !description && !breadcrumb && !actions) return null

  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="space-y-1">
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-[var(--text-3)]">
            {breadcrumb.map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight size={11} />}
                <span>{item.label}</span>
              </React.Fragment>
            ))}
          </div>
        )}
        {title && <h1 className="text-lg font-bold text-[var(--text-1)]">{title}</h1>}
        {description && <p className="text-sm text-[var(--text-3)]">{description}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  )
}
