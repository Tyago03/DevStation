import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Project, RunConfig, SaveRunConfig, Settings } from '../../shared/contracts';
import { AppError } from '../../shared/errors';
import { pathIdentity } from '../security/paths';
import { settingsSchema, tourSchema } from '../../shared/schemas';

interface ProjectRow { id: string; display_name: string; canonical_path: string; added_at: string }
interface ConfigRow { id: string; project_id: string; display_name: string; executable_path: string; args_json: string; working_dir: string; recipe_json: string | null }
const projectFromRow = (row: ProjectRow): Project => ({ id: row.id, name: row.display_name, path: row.canonical_path, addedAt: row.added_at });
const configFromRow = (row: ConfigRow): RunConfig => ({ id: row.id, projectId: row.project_id, label: row.display_name, executablePath: row.executable_path, args: JSON.parse(row.args_json) as string[], workingDir: row.working_dir, ...(row.recipe_json ? { recipe: JSON.parse(row.recipe_json) as RunConfig['recipe'] } : {}) });

export class Store {
  private db: Database.Database;
  constructor(public readonly filename: string) {
    mkdirSync(path.dirname(filename), { recursive: true });
    const wasExisting = existsSync(filename);
    let opened: Database.Database | undefined;
    try {
      opened = new Database(filename);
      this.db = opened;
      this.db.pragma('foreign_keys = ON');
      const integrity = this.db.pragma('quick_check', { simple: true });
      if (integrity !== 'ok') throw new Error('integrity check failed');
      const version = this.db.pragma('user_version', { simple: true }) as number;
      if (version > 2) throw new AppError('SQLITE_NEWER_SCHEMA', 'This database belongs to a newer DevStation version. Update DevStation; your data was left untouched.');
      if (version < 2) {
        if (wasExisting) {
          const backup = `${filename}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
          this.db.prepare('VACUUM INTO ?').run(backup);
        }
        this.db.transaction(() => {
          if (version < 1) {
            this.db.exec(`
            CREATE TABLE projects (
              id TEXT PRIMARY KEY,
              display_name TEXT NOT NULL,
              canonical_path TEXT NOT NULL,
              path_identity TEXT NOT NULL UNIQUE,
              added_at TEXT NOT NULL
            );
            CREATE TABLE run_configs (
              id TEXT PRIMARY KEY,
              project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
              display_name TEXT NOT NULL,
              executable_path TEXT NOT NULL,
              args_json TEXT NOT NULL,
              working_dir TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE settings (key TEXT PRIMARY KEY, json_value TEXT NOT NULL);
            CREATE TABLE migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
          `);
            this.db.prepare('INSERT INTO migrations VALUES (?, ?)').run(1, new Date().toISOString());
          }
          this.db.exec('ALTER TABLE run_configs ADD COLUMN recipe_json TEXT');
          this.db.prepare('INSERT INTO migrations VALUES (?, ?)').run(2, new Date().toISOString());
          this.db.pragma('user_version = 2');
        })();
      }
      this.db.pragma('journal_mode = WAL');
    } catch (error) {
      opened?.close();
      if (error instanceof AppError) throw error;
      throw new AppError('SQLITE_ERROR', 'DevStation could not open its local database. Your files were left untouched. Close the app and restore a database backup, or move the database aside to start a new catalog.');
    }
  }
  close(): void { this.db.close(); }
  listProjects(): Project[] {
    return (this.db.prepare('SELECT * FROM projects ORDER BY added_at DESC, id').all() as ProjectRow[]).map(projectFromRow);
  }
  getProject(id: string): Project {
    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined;
    if (!row) throw new AppError('PROJECT_NOT_FOUND', 'This project is no longer in DevStation.');
    return projectFromRow(row);
  }
  addProject(canonical: string): Project {
    if (this.db.prepare('SELECT id FROM projects WHERE path_identity = ?').get(pathIdentity(canonical))) {
      throw new AppError('PROJECT_DUPLICATE', 'This repository is already in DevStation.');
    }
    const project = { id: randomUUID(), name: path.basename(canonical), path: canonical, addedAt: new Date().toISOString() };
    this.db.prepare('INSERT INTO projects (id, display_name, canonical_path, path_identity, added_at) VALUES (?, ?, ?, ?, ?)').run(project.id, project.name, project.path, pathIdentity(canonical), project.addedAt);
    return project;
  }
  removeProject(id: string): void { this.getProject(id); this.db.prepare('DELETE FROM projects WHERE id = ?').run(id); }
  listConfigs(projectId: string): RunConfig[] {
    this.getProject(projectId);
    return (this.db.prepare('SELECT * FROM run_configs WHERE project_id = ? ORDER BY created_at, id').all(projectId) as ConfigRow[]).map(configFromRow);
  }
  getConfig(id: string): RunConfig {
    const row = this.db.prepare('SELECT * FROM run_configs WHERE id = ?').get(id) as ConfigRow | undefined;
    if (!row) throw new AppError('CONFIG_NOT_FOUND', 'This run configuration no longer exists.');
    return configFromRow(row);
  }
  saveConfig(input: SaveRunConfig): RunConfig {
    const now = new Date().toISOString();
    const id = input.id ?? randomUUID();
    if (input.id) {
      const existing = this.getConfig(input.id);
      if (existing.projectId !== input.projectId) throw new AppError('INVALID_CONFIG', 'A configuration cannot be moved to another project.');
      this.db.prepare('UPDATE run_configs SET display_name = ?, executable_path = ?, args_json = ?, working_dir = ?, recipe_json = ?, updated_at = ? WHERE id = ?').run(input.label, input.executablePath, JSON.stringify(input.args), input.workingDir, input.recipe ? JSON.stringify(input.recipe) : null, now, id);
    } else {
      this.db.prepare('INSERT INTO run_configs (id, project_id, display_name, executable_path, args_json, working_dir, recipe_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, input.projectId, input.label, input.executablePath, JSON.stringify(input.args), input.workingDir, input.recipe ? JSON.stringify(input.recipe) : null, now, now);
    }
    return this.getConfig(id);
  }
  deleteConfig(id: string): void { this.getConfig(id); this.db.prepare('DELETE FROM run_configs WHERE id = ?').run(id); }
  getSettings(): Settings {
    const settings: Settings = { theme: 'dark' };
    const row = this.db.prepare('SELECT json_value FROM settings WHERE key = ?').get('appearance') as { json_value: string } | undefined;
    if (row) try {
      const value = JSON.parse(row.json_value) as Settings;
      if (['dark', 'light', 'system'].includes(value.theme)) settings.theme = value.theme;
    } catch { /* Unsupported local preference falls back without deleting data. */ }
    const tour = this.db.prepare('SELECT json_value FROM settings WHERE key = ?').get('tour') as { json_value: string } | undefined;
    if (tour) try { const parsed = tourSchema.safeParse(JSON.parse(tour.json_value)); if (parsed.success) settings.tour = parsed.data; } catch { /* Retain malformed data for recovery. */ }
    return settings;
  }
  updateSettings(settings: Settings): Settings {
    const parsed = settingsSchema.safeParse(settings);
    if (!parsed.success) throw new AppError('INVALID_SETTINGS', 'Choose valid appearance and tour settings.');
    this.db.transaction(() => {
      const update = this.db.prepare('INSERT INTO settings (key, json_value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET json_value = excluded.json_value');
      update.run('appearance', JSON.stringify({ theme: parsed.data.theme }));
      if (parsed.data.tour) update.run('tour', JSON.stringify(parsed.data.tour));
    })();
    return this.getSettings();
  }
}
