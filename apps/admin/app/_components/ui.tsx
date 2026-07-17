import React, { type ReactNode } from "react";

export function PageTitle({
  actions,
  description,
  eyebrow,
  title
}: {
  actions?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <header className="page-title">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {actions ? <div className="page-title-actions">{actions}</div> : null}
    </header>
  );
}

export function SectionHeader({
  action,
  description,
  title
}: {
  action?: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Metric({
  icon,
  label,
  tone = "default",
  value
}: {
  icon?: ReactNode;
  label: string;
  tone?: "default" | "attention" | "danger" | "success";
  value: number | string;
}) {
  return (
    <div className={`metric metric-${tone}`}>
      {icon ? <span className="metric-icon">{icon}</span> : null}
      <span className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

export function EmptyState({ children, title }: { children?: ReactNode; title: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {children ? <div>{children}</div> : null}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: "neutral" | "info" | "attention" | "danger" | "success";
}) {
  return <span className={`status-badge status-badge-${tone}`}>{children}</span>;
}
