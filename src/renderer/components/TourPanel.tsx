import { ArrowLeft, ArrowRight, Compass, Play } from 'lucide-react';
import { useState } from 'react';
import type { Settings } from '../../shared/contracts';

type Tour = NonNullable<Settings['tour']>;
const steps = [
  { title: 'What is DevStation?', text: 'Manage local projects, safely launch tasks, and inspect their output. Your files stay on your computer. Nothing runs automatically.', action: undefined },
  { title: 'Add a Git project', text: 'Choose a local Git folder. DevStation explains the detected root and registers it without moving or changing your files. Git is needed to inspect repositories; you can continue this tour without it.', action: 'Add a project' },
  { title: 'Understand project status', text: 'Clean means no pending changes at the last check. Staged changes are prepared for a future commit; Untracked means new files. Not checked is not the same as Clean.', action: 'Open project status' },
  { title: 'Create a launch setup', text: 'Choose a guided Python or Node.js task, or Advanced executable. Review the program and separate arguments. Saving never starts a program, and missing tools do not prevent finishing this tour.', action: 'Go to launch setups' },
  { title: 'Run and follow output', text: 'Start always asks for confirmation. Runs shows messages and exit status. Stop targets only the main process DevStation started; children may remain. Unknown is not Stopped.', action: 'View running tasks' },
] as const;

export function TourPanel({ tour, onUpdate, onAction }: { tour: Tour; onUpdate: (tour: Tour) => Promise<void>; onAction: (step: number) => void }) {
  const [busy, setBusy] = useState(false);
  const step = steps[tour.step] ?? steps[0];
  async function update(next: Tour) { setBusy(true); try { await onUpdate(next); } finally { setBusy(false); } }
  if (tour.status !== 'in-progress') return null;
  return <section className="tour-panel" aria-label="Getting started tour"><div className="tour-heading"><span><Compass size={17} />YOUR FIRST PROJECT · STEP {tour.step + 1} OF 5</span><button className="text-button" disabled={busy} onClick={() => { void update({ ...tour, status: 'skipped' }); }}>Skip tour</button></div><h2>{step.title}</h2><p>{step.text}</p><div className="tour-actions"><button className="button secondary" disabled={busy || tour.step === 0} onClick={() => { void update({ status: 'in-progress', step: tour.step - 1 }); }}><ArrowLeft size={14} />Back</button>{step.action && <button className="text-button" onClick={() => onAction(tour.step)}>{step.action}<ArrowRight size={14} /></button>}<button className="button primary" disabled={busy} onClick={() => { void update(tour.step === 4 ? { status: 'completed', step: 4 } : { status: 'in-progress', step: tour.step + 1 }); }}>{tour.step === 4 ? 'Finish tour' : 'Next'}<ArrowRight size={14} /></button></div></section>;
}

export function TourInvitation({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return <section className="tour-invitation"><Compass size={23} /><div><h2>New here? Take a short tour.</h2><p>Five optional steps. You decide whether to import or run anything.</p></div><button className="button secondary" onClick={onSkip}>Skip</button><button className="button primary" onClick={onStart}><Play size={14} />Start tour</button></section>;
}
