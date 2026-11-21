export const navigation = ['Overview', 'Projects', 'Runs', 'Ports', 'Diagnostics', 'Settings'] as const;
export type PageName = (typeof navigation)[number];
export const pageCopy: Record<PageName, { eyebrow: string; title: string; description: string }> = {
  Overview: { eyebrow: 'YOUR WORKSPACE', title: 'Everything in its place.', description: 'Your projects, processes, and local environment. One clear view.' },
  Projects: { eyebrow: 'LOCAL REPOSITORIES', title: 'Projects', description: 'Keep your repositories close and their status in view.' },
  Runs: { eyebrow: 'SESSION ACTIVITY', title: 'Runs', description: 'Follow the tasks you started, from first output to exit.' },
  Ports: { eyebrow: 'LOCAL NETWORK', title: 'Ports', description: 'See what is listening on your machine. Read-only, on demand.' },
  Diagnostics: { eyebrow: 'DEVELOPMENT TOOLS', title: 'Diagnostics', description: 'Check the tools available to your local development environment.' },
  Settings: { eyebrow: 'MAKE IT YOURS', title: 'Settings', description: 'A small workspace, set up the way you like it.' },
};
export const copy = {
  addProject: 'Add project',
  emptyProjects: 'Bring your projects into focus.',
  emptyProjectsDescription: 'Add a local Git repository to see its status, configure a task, and keep your work in one place.',
  privacy: 'DevStation runs locally. No account, analytics or cloud sync.',
  runTrust: 'Only run executables and projects you trust. Tasks run locally with your user permissions.',
  noRun: 'No tasks started this session.',
  notChecked: 'Not checked',
};
