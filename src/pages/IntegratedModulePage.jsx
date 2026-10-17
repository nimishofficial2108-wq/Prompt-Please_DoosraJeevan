import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Maximize2, Minimize2, RefreshCcw, AlertCircle, Info } from 'lucide-react';
import './integrated-module.css';

const modules = {
  neuroscan: { source: '/modules/neuro/', health: '/api/neuro/health' },
  donation: { source: '/modules/organ/', health: '/api/organ/health' },
};

export default function IntegratedModulePage({ service }) {
  const [refresh, setRefresh] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState('checking');
  const [loaded, setLoaded] = useState(false);
  const [ledgerMode, setLedgerMode] = useState('unknown');
  const module = modules[service.id];
  useEffect(() => {
    document.title = `${service.name} | DoosraJeevan`;
    setStatus('checking'); setLoaded(false);
    if (!module) return;
    const controller = new AbortController();
    if (service.id === 'donation') fetch('/api/blockchain/status', {signal:controller.signal}).then(r=>r.json()).then(d=>setLedgerMode(d.mode||'unknown')).catch(()=>setLedgerMode('offline'));
    fetch(module.health, {signal:controller.signal,cache:'no-store'})
      .then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`);const result=await r.json();if(result.status!=='ok')throw new Error('Module server not ready');setStatus('online');})
      .catch(e => {if(e.name!=='AbortError')setStatus('offline');});
    return () => controller.abort();
  }, [service.id, refresh]);
  if (!module) return null;
  const reload = () => {setLoaded(false);setRefresh(x=>x+1)};
  return <main id="main" className={`module-page ${expanded?'module-expanded':''} ${service.id==='neuroscan'?'module-neuro':'module-organ'}`}>
    <div className="module-bar content-width">
      <div className="module-intro"><Link to="/" aria-label="Back to all services"><ArrowLeft size={18}/> All services</Link><span className="module-separator">/</span><strong>{service.name}</strong><span className="module-label">{service.id==='neuroscan'?'CT workstation':'Donation information & demo registry'}</span></div>
      <div className="module-actions">
        <button type="button" className="module-action" onClick={reload}><RefreshCcw size={16}/> Reload</button>
        <a href={module.source} className="module-action" target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/> New tab</a>
        <button type="button" className="module-action" onClick={()=>setExpanded(x=>!x)}>{expanded?<Minimize2 size={16}/>:<Maximize2 size={16}/>} {expanded?'Compact':'Expand'}</button>
      </div>
    </div>
    <div className="module-notice content-width" role="note"><Info size={15}/><span>{service.id==='neuroscan'?'For education only. Sample images and audio are simulated; not a diagnosis. Select Enable Sound inside the scanner.':`Independent educational prototype — not an official government registry. Ledger: ${ledgerMode==='onchain'?'Polygon Amoy configured (verify transactions)':ledgerMode==='demo'?'LOCAL SIMULATION, not on-chain':'offline/unverified'}.`}</span></div>
    <div className="module-frame-wrap content-width">
      {status==='checking'&&<div className="module-status" role="status">Connecting to {service.name}…</div>}
      {status==='offline'&&<div className="module-status module-error" role="alert"><AlertCircle size={30}/><h2>Unable to connect to {service.name}</h2><p>Run <code>npm run dev:all</code> at the root and wait until all services start, then retry.</p><button type="button" className="module-action" onClick={reload}><RefreshCcw size={16}/> Retry</button></div>}
      {status==='online'&&<>{!loaded&&<div className="module-loading" role="status">Loading {service.name}…</div>}<iframe key={`${service.id}:${refresh}`} title={`${service.name} | DoosraJeevan`} src={module.source} onLoad={()=>setLoaded(true)} allow="autoplay; fullscreen" loading="eager" referrerPolicy="strict-origin-when-cross-origin"/></>}
    </div>
  </main>;
}
