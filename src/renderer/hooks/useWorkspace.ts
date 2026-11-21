import { useCallback, useEffect, useRef, useState } from 'react';
import type { GitOverview, ManagedRun, Project, Result, Settings } from '../../shared/contracts';

export function valueOf<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
export function messageOf(error: unknown) { return error instanceof Error ? error.message : 'This action could not be completed. Please try again.'; }
export interface GitState { overview?: GitOverview; error?: string; loading: boolean }

export function useWorkspace() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [runs, setRuns] = useState<ManagedRun[]>([]);
  const [git, setGit] = useState<Record<string, GitState>>({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string>();
  const [settings, setSettings] = useState<Settings>({ theme: 'dark' });
  const [version, setVersion] = useState('');
  const live = useRef(true);
  const pendingGit = useRef(new Set<string>());
  const pendingRuns = useRef(false);

  const report = useCallback((problem: unknown) => setError(messageOf(problem)), []);
  const refreshGit = useCallback(async (projectId: string) => {
    if (pendingGit.current.has(projectId)) return;
    pendingGit.current.add(projectId);
    setGit(previous => ({ ...previous, [projectId]: { ...previous[projectId], error: undefined, loading: true } }));
    try {
      const overview = valueOf(await window.devstation.projects.gitOverview(projectId));
      if (live.current) setGit(previous => ({ ...previous, [projectId]: { overview, loading: false } }));
    } catch (problem) {
      if (live.current) setGit(previous => ({ ...previous, [projectId]: { error: messageOf(problem), loading: false } }));
    } finally { pendingGit.current.delete(projectId); }
  }, []);

  const refreshRuns = useCallback(async () => {
    if (pendingRuns.current) return;
    pendingRuns.current = true;
    try { const next = valueOf(await window.devstation.runs.list()); if (live.current) setRuns(next); }
    catch (problem) { if (live.current) report(problem); }
    finally { pendingRuns.current = false; }
  }, [report]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = valueOf(await window.devstation.projects.list());
      if (!live.current) return;
      setProjects(next);
      // Bound Git concurrency even when many projects have been imported.
      const queue = [...next];
      void Promise.all(Array.from({ length: Math.min(3, next.length) }, async () => {
        while (queue.length && live.current) { const project = queue.shift(); if (project) await refreshGit(project.id); }
      }));
    } catch (problem) { if (live.current) report(problem); }
    finally { if (live.current) setLoading(false); }
  }, [refreshGit, report]);

  useEffect(() => {
    live.current = true;
    void load();
    void refreshRuns();
    void window.devstation.settings.get().then(result => { if (live.current) setSettings(valueOf(result)); }).catch(report);
    void window.devstation.app.info().then(result => { if (live.current) setVersion(valueOf(result).version); }).catch(report);
    const timer = window.setInterval(() => { void refreshRuns(); }, 1500);
    return () => { live.current = false; window.clearInterval(timer); };
  }, [load, refreshRuns, report]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => { document.documentElement.dataset.theme = settings.theme === 'system' ? (query.matches ? 'light' : 'dark') : settings.theme; };
    apply(); query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [settings.theme]);

  async function addProject() {
    setAdding(true);
    try {
      const project = valueOf(await window.devstation.projects.chooseAndAdd());
      if (project) { setProjects(previous => previous.some(item => item.id === project.id) ? previous : [project, ...previous]); void refreshGit(project.id); }
      return project;
    } catch (problem) { report(problem); return null; }
    finally { setAdding(false); }
  }

  async function removeProject(id: string) {
    try { valueOf(await window.devstation.projects.remove(id)); const next = valueOf(await window.devstation.projects.list()); setProjects(next); return !next.some(project => project.id === id); }
    catch (problem) { report(problem); return false; }
  }

  async function updateSettings(next: Settings) {
    try { setSettings(valueOf(await window.devstation.settings.update(next))); }
    catch (problem) { report(problem); }
  }

  return { projects, runs, git, loading, adding, error, setError, settings, version, report, refreshGit, refreshRuns, load, addProject, removeProject, updateSettings };
}
export type Workspace = ReturnType<typeof useWorkspace>;
