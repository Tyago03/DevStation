import { FileCheck2, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RunConfig, ScriptReview } from '../../shared/contracts';
import { messageOf } from '../hooks/useWorkspace';
import { ErrorBanner, fullTime, Loading } from './common';

/** Reveal invisible controls without changing the bytes authorized by main. */
export function visibleScriptText(value: string): string {
  return [...value].map(character => {
    const point = character.codePointAt(0)!;
    const invisible = (point < 32 && point !== 9 && point !== 10 && point !== 13) || (point >= 127 && point <= 159) || point === 0x061c || (point >= 0x200b && point <= 0x200f) || (point >= 0x202a && point <= 0x202e) || (point >= 0x2060 && point <= 0x206f) || point === 0xfeff;
    return invisible ? `⟦U+${point.toString(16).toUpperCase().padStart(4, '0')}⟧` : character;
  }).join('');
}

export function ScriptReviewDialog({ config, onClose, onAuthorized, onEdit, onReturnFocus }: { config: RunConfig; onClose: () => void; onAuthorized: (config: RunConfig) => void; onEdit: () => void; onReturnFocus: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const fallbackFocus = useRef(onReturnFocus);
  const generation = useRef(0);
  const [review, setReview] = useState<ScriptReview>();
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [error, setError] = useState<string>();
  const [externalReview, setExternalReview] = useState(false);
  useLayoutEffect(() => {
    const previousFocus = document.activeElement;
    dialog.current?.showModal(); title.current?.focus();
    return () => { if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus(); else fallbackFocus.current(); };
  }, []);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError(undefined); setReview(undefined); setExternalReview(false);
    try {
      const result = await window.devstation.configs.reviewScript(config.id);
      if (request !== generation.current) return;
      if (result.ok) setReview(result.data);
      else { setError(result.error.message); setExternalReview(result.error.code === 'SCRIPT_REVIEW_UNAVAILABLE'); }
    } catch (problem) { if (request === generation.current) setError(messageOf(problem)); }
    finally { if (request === generation.current) setLoading(false); }
  }, [config.id]);
  useEffect(() => { void load(); return () => { generation.current += 1; }; }, [load]);
  async function authorize() {
    if (!review || authorizing) return;
    setAuthorizing(true); setError(undefined);
    try {
      const result = await window.devstation.configs.authorizeScript(config.id, review.token);
      if (result.ok) { if (result.data) onAuthorized(result.data); else onClose(); }
      else { setReview(undefined); setError(result.error.message); title.current?.focus(); }
    } catch (problem) { setReview(undefined); setError(messageOf(problem)); title.current?.focus(); }
    finally { setAuthorizing(false); }
  }
  const content = review ? visibleScriptText(review.content) : '';
  return <dialog ref={dialog} className="configuration-dialog script-review-dialog" aria-labelledby="script-review-title" aria-describedby="script-review-intro" onClose={onClose} onCancel={event => { if (authorizing) event.preventDefault(); }}>
    <div className="dialog-heading"><div><span className="eyebrow">{config.label}</span><h2 ref={title} tabIndex={-1} id="script-review-title">Review script changes</h2><p id="script-review-intro">Review the current file, then confirm whether this setup may use it. Nothing runs during this review.</p></div><button className="icon-button" aria-label="Close script review" disabled={authorizing} onClick={() => dialog.current?.close()}><X size={19} /></button></div>
    <div className="dialog-body">{loading ? <Loading label="Reading the current script…" /> : <>
      {error && <ErrorBanner message={error} />}
      {review ? <>
        <p className="script-review-path mono">{visibleScriptText(review.scriptPath)}</p>
        <div className="script-review-summary"><FileCheck2 size={18} /><p>{review.changed ? 'The file differs from the version you previously authorized.' : 'The current file matches the saved version.'} Earlier source text is not stored, so this shows the complete current version rather than a line-by-line comparison.</p></div>
        {content !== review.content && <div className="notice warning-notice">Invisible control characters are displayed as ⟦U+…⟧ markers. The original file is unchanged.</div>}
        <div className="script-source-heading"><h3>Current version</h3><span>{review.byteLength.toLocaleString()} bytes · complete preview</span></div>
        <pre className="script-source" tabIndex={0} role="region" aria-label="Current script version"><code>{content || '(Empty file)'}</code></pre>
        <details className="script-review-metadata"><summary>Version fingerprints and review expiry</summary><dl><dt>Previously authorized SHA-256</dt><dd><code>{review.previousFingerprint}</code></dd><dt>Current SHA-256</dt><dd><code>{review.fingerprint}</code></dd><dt>Review expires</dt><dd>{fullTime(review.expiresAt)}</dd></dl></details>
        <p className="field-hint">Only this script file is reviewed. Imported code and dependencies are not included. The file is checked again before authorization and before a later Start.</p>
      </> : <p className="script-review-empty">{externalReview ? 'Review the file in an editor you trust, then edit the setup and choose the script again. No partial preview can be authorized here.' : 'No version has been authorized. Reload the current file to review it again.'}</p>}
    </>}</div>
    <div className="dialog-footer"><button className="button secondary" disabled={authorizing} onClick={() => dialog.current?.close()}>Cancel</button>{error && !review && <button className="button secondary" onClick={onEdit}>Edit setup</button>}{!loading && <button className="button secondary" disabled={authorizing} onClick={() => { void load(); }}><RefreshCw size={14} />Reload current version</button>}{review && <button className="button primary" disabled={authorizing || loading} onClick={() => { void authorize(); }}>{authorizing ? 'Waiting for confirmation…' : 'Authorize this version'}</button>}</div>
  </dialog>;
}
