import { AlertCircle, ArrowRight, FolderPlus, LoaderCircle, RefreshCw, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { GitOverview, ManagedRun } from '../../shared/contracts';

export function ErrorBanner({ message, onDismiss, onRetry }: { message: string; onDismiss?: () => void; onRetry?: () => void }) {
  return <div className="notice error-notice" role="alert"><AlertCircle size={17} /><span>{message}</span>{onRetry && <button className="text-button" onClick={onRetry}>Try again</button>}{onDismiss && <button className="icon-button" aria-label="Dismiss error" onClick={onDismiss}><X size={16} /></button>}</div>;
}

export function EmptyState({ icon, title, description, action, compact = false }: { icon?: ReactNode; title: string; description: string; action?: ReactNode; compact?: boolean }) {
  return <div className={`empty-state ${compact ? 'compact' : ''}`}><div className="empty-icon">{icon ?? <FolderPlus size={28} />}</div><h2>{title}</h2><p>{description}</p>{action}</div>;
}

export function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return <div className="empty-state compact"><div className="empty-icon"><AlertCircle size={26} /></div><h2>{title}</h2><p role="alert">{message}</p><button className="button secondary" onClick={onRetry}><RefreshCw size={15} />Try again</button></div>;
}

export function Loading({ label = 'Loading workspace…' }: { label?: string }) {
  return <div className="loading" role="status"><LoaderCircle className="spin" size={18} />{label}</div>;
}

export function RefreshButton({ busy, onClick, label = 'Refresh' }: { busy?: boolean; onClick: () => void; label?: string }) {
  return <button className="button secondary" disabled={busy} onClick={onClick}><RefreshCw size={15} className={busy ? 'spin' : ''} />{busy ? 'Checking…' : label}</button>;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent' }) {
  return <span className={`badge ${tone}`}><span className="status-dot" />{children}</span>;
}

export function GitBadge({ overview, error, loading }: { overview?: GitOverview; error?: string; loading?: boolean }) {
  if (loading) return <Badge>Checking</Badge>;
  if (error) return <Badge tone="danger">Unavailable</Badge>;
  if (!overview || overview.dirty === null) return <Badge>Not checked</Badge>;
  if (overview.isUnborn) return <Badge tone="warning">No commits</Badge>;
  return <Badge tone={overview.dirty ? 'warning' : 'success'}>{overview.dirty ? 'Changes' : 'Clean'}</Badge>;
}

export function RunBadge({ run }: { run: ManagedRun }) {
  const label = run.state === 'exited' ? `Exited (${run.exitCode ?? 'unknown'})` : run.state.charAt(0).toUpperCase() + run.state.slice(1);
  const tone = run.state === 'running' ? 'success' : run.state === 'failed' || (run.state === 'exited' && run.exitCode !== 0) ? 'danger' : run.state === 'unknown' ? 'warning' : 'neutral';
  return <Badge tone={tone}>{label}</Badge>;
}

export function SectionTitle({ title, meta, action }: { title: string; meta?: string; action?: ReactNode }) {
  return <div className="section-title"><div><h2>{title}</h2>{meta && <span>{meta}</span>}</div>{action}</div>;
}

export function ViewAll({ onClick, children = 'View all' }: { onClick: () => void; children?: ReactNode }) {
  return <button className="text-button" onClick={onClick}>{children}<ArrowRight size={14} /></button>;
}

export function shortTime(value: string) { return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
export function fullTime(value: string) { return new Date(value).toLocaleString(); }
export function isActive(run: ManagedRun) { return run.state === 'starting' || run.state === 'running' || run.state === 'stopping' || run.state === 'unknown'; }
