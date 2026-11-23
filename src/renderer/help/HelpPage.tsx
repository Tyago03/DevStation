import { BookOpen, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState } from '../components/common';
import { helpById, searchHelp, type HelpTopicId } from './content';

export function HelpPage({ topic = 'getting-started' }: { topic?: HelpTopicId }) {
  const [selected, setSelected] = useState<HelpTopicId>(topic);
  const [query, setQuery] = useState('');
  useEffect(() => { setSelected(topic); setQuery(''); }, [topic]);
  const results = searchHelp(query);
  const current = results.find(item => item.id === selected) ?? results[0];
  return <section className="panel help-panel"><div className="table-toolbar"><label className="search-field"><Search size={16} /><input aria-label="Search offline help" placeholder="Search help: PID, Python, working directory…" value={query} onChange={event => setQuery(event.target.value)} /></label><span className="result-count">Bundled help · works offline</span></div>{!current ? <EmptyState icon={<BookOpen size={26} />} title="No matching help topics." description="Try a shorter term, such as project, output, or port." compact /> : <div className="help-layout"><nav className="help-topics" aria-label="Help topics">{results.map(item => <button key={item.id} aria-current={item.id === current.id ? 'page' : undefined} className={item.id === current.id ? 'selected' : ''} onClick={() => setSelected(item.id)}>{item.title}</button>)}</nav><article className="help-article"><span className="eyebrow">OFFLINE GUIDE</span><h2>{current.title}</h2><p className="help-summary">{current.summary}</p>{current.sections.map(section => <section key={section.title}><h3>{section.title}</h3>{section.paragraphs.map(text => <p key={text}>{text}</p>)}{section.example && <pre>{section.example}</pre>}</section>)}</article></div>}</section>;
}

export function TermHelp({ topic, summary, children }: { topic: HelpTopicId; summary: string; children?: React.ReactNode }) {
  return <details className="term-help"><summary>{summary}</summary><div>{children ?? <p>{helpById[topic].summary}</p>}<p className="field-hint">Find more in Documentation → {helpById[topic].title}.</p></div></details>;
}
