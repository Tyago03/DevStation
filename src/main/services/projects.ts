import type { Store } from '../storage/store';
import type { GitService } from './git';
import { AppError } from '../../shared/errors';

export class ProjectService {
  constructor(private store: Store, private git: GitService, private isActive: (projectId: string) => boolean) {}
  list() { return this.store.listProjects(); }
  get(id: string) { return this.store.getProject(id); }
  async add(directory: string) { return this.store.addProject(await this.git.root(directory)); }
  remove(id: string) {
    if (this.isActive(id)) throw new AppError('PROJECT_RUNNING', 'Stop this project’s active runs before removing it from DevStation.');
    this.store.removeProject(id);
  }
}
