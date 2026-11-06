import type { ReactNode } from "react";
export function Panel({
  title,
  children,
  actions,
  className = "",
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`} aria-label={title}>
      <div className="panel-header">
        <h2>{title}</h2>
        <div className="panel-actions">{actions}</div>
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}
