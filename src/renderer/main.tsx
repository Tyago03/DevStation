import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

class RenderBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="fatal-state"><h1>DevStation could not display this view.</h1><p>Your project files are unchanged. Close and reopen the app to try again.</p></main>;
    return this.props.children;
  }
}
createRoot(document.getElementById('root')!).render(<RenderBoundary><App /></RenderBoundary>);
