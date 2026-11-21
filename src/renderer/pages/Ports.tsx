import { Info, Network, Search } from 'lucide-react';
import { useState } from 'react';
import type { ListeningPort } from '../../shared/contracts';
import { messageOf, valueOf } from '../hooks/useWorkspace';
import { Badge, EmptyState, ErrorBanner, fullTime, Loading, RefreshButton } from '../components/common';

export function PortsPage() {
  const [ports, setPorts] = useState<ListeningPort[]>();
  const [checkedAt, setCheckedAt] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState('');
  async function check() {
    setBusy(true); setError(undefined);
    try { const result = valueOf(await window.devstation.ports.list()); setPorts(result.ports); setCheckedAt(result.checkedAt); }
    catch (problem) { setError(messageOf(problem)); }
    finally { setBusy(false); }
  }
  const filtered = ports?.filter(port => `${port.address} ${port.port} ${port.pid ?? ''}`.includes(query));
  return <section className="panel"><div className="table-toolbar"><label className="search-field"><Search size={16} /><input aria-label="Search ports" placeholder="Filter by port, address, or PID…" value={query} onChange={event => setQuery(event.target.value)} /></label><span className="result-count">{ports ? `${ports.length} TCP listeners` : 'Not checked yet'}</span><RefreshButton busy={busy} onClick={() => { void check(); }} /></div>
    {error && <ErrorBanner message={`${error}${ports ? ' The table shows the previous successful check.' : ''}`} onRetry={() => { void check(); }} />}
    {busy && !ports ? <Loading label="Inspecting local TCP listeners…" /> : !ports ? <EmptyState icon={<Network size={30} />} title="Get a picture of your ports." description="Refresh to list local TCP listeners, their addresses, and the process IDs reported by Windows." action={<button className="button primary" onClick={() => { void check(); }}>Inspect listening ports</button>} /> : filtered?.length === 0 ? <EmptyState icon={<Network size={28} />} title={query ? 'No matching listeners.' : 'No TCP listening ports found.'} description={query ? 'Try another port number, address, or process ID.' : 'Windows reported no listening TCP ports at the last check.'} compact /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Local address</th><th>Port</th><th>Process ID</th><th>Scope</th><th>Protocol</th></tr></thead><tbody>{filtered?.map(port => <tr key={`${port.address}:${port.port}:${port.pid}`}><td className="mono">{port.address}</td><td><strong className="port-number mono">{port.port}</strong></td><td className="mono">{port.pid ?? 'Unavailable'}</td><td title={port.visibility === 'all-interfaces' ? 'Listening on all local interfaces; external reachability depends on firewall and network settings.' : undefined}><Badge tone={port.visibility === 'loopback' ? 'accent' : 'neutral'}>{port.visibility === 'loopback' ? 'Loopback' : port.visibility === 'all-interfaces' ? 'All interfaces' : 'Other'}</Badge></td><td><span className="protocol-label">TCP</span></td></tr>)}</tbody></table></div>}
    <div className="panel-footnote"><Info size={14} /><span>{checkedAt ? `Checked ${fullTime(checkedAt)}. ` : ''}Read-only inspection. All interfaces does not necessarily mean reachable from the internet.</span></div>
  </section>;
}
