import React, { useEffect, useRef, useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, FileCheck2, FileHeart, FileText, LocateFixed, MapPin, Phone, ShieldAlert, Stethoscope, UploadCloud, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import './reports.css';
import { readApiJson } from '../lib/apiResponse.js';

const MAX_BYTES = 8 * 1024 * 1024;

function Metric({ metric, needsReview = false }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className={`report-metric ${needsReview ? 'metric-review' : 'metric-good'}`}>
      <div className="metric-line">
        <span className="metric-status-icon" aria-hidden="true">{needsReview ? <ShieldAlert size={20}/> : <CheckCircle2 size={20}/>}</span>
        <div className="metric-primary">
          <h3>{metric.name}</h3>
          <p><strong>{metric.value}</strong> {metric.unit} <span className="metric-reference">Ref: {metric.reference || 'Not listed'}</span></p>
        </div>
        {needsReview && metric.attentionScore !== null && metric.attentionScore !== undefined && (
          <span className="metric-score" title="Experimental attention score — not a validated clinical risk">{metric.attentionScore}<small>/100 attention</small></span>
        )}
        <button type="button" className="metric-details-toggle" aria-label={expanded ? `Hide explanation for ${metric.name}` : `Show explanation for ${metric.name}`} onClick={() => setExpanded(!expanded)}>{expanded ? <ChevronUp size={19}/> : <ChevronDown size={19}/>}</button>
      </div>
      {expanded && <div className="metric-explanation">{metric.explanation || 'Ask your clinician to explain this test.'}{needsReview && metric.scoreNote ? <p>{metric.scoreNote}</p> : null}{needsReview && metric.specialty ? <span className="metric-specialty">Discuss with: {metric.specialty}</span> : null}</div>}
    </article>
  );
}

function DoctorCard({ doctor, index }) {
  return (
    <article className="doctor-result">
      <span className="doctor-number">{index + 1}</span>
      <div className="doctor-details">
        <h3>{doctor.name}</h3>
        <p className="doctor-type">{doctor.type}{Number.isFinite(doctor.distanceKm) ? ` · ~${doctor.distanceKm} km straight-line distance` : ''}</p>
        <p className={`doctor-specialty ${doctor.specialtyStatus === 'listed' ? 'is-listed' : 'is-unconfirmed'}`}>
          {doctor.specialtyDescription}
        </p>
        <p className="doctor-address"><MapPin size={16} aria-hidden="true"/> {doctor.address}</p>
        <div className="doctor-actions">
          {doctor.phone && <a href={`tel:${doctor.phone.replace(/[^\d+]/g, '')}`}><Phone size={16}/> Call</a>}
          <a href={doctor.mapsUrl} target="_blank" rel="noopener noreferrer"><MapPin size={16}/> Open map <ArrowRight size={15}/></a>
          <a href={doctor.osmUrl} target="_blank" rel="noopener noreferrer">Listing details <ArrowRight size={15}/></a>
          {doctor.website && <a href={doctor.website} target="_blank" rel="noopener noreferrer">Website <ArrowRight size={15}/></a>}
        </div>
      </div>
    </article>
  );
}

export default function ReportsPage() {
  const [file, setFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [doctors, setDoctors] = useState([]);
  const [doctorStatus, setDoctorStatus] = useState('idle');
  const [doctorError, setDoctorError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { document.title = 'Reports Analysis | DoosraJeevan'; }, []);

  function acceptFile(next) {
    setError(''); setResult(null); setDoctors([]); setDoctorStatus('idle'); setDoctorError(''); setConsent(false);
    if (!next) return setFile(null);
    if (!next.name.toLowerCase().endsWith('.pdf') || next.type !== 'application/pdf') return setError('Choose a PDF file only.');
    if (next.size > MAX_BYTES) return setError('PDF must be smaller than 8 MB.');
    setFile(next);
  }

  async function analyze(event) {
    event.preventDefault();
    if (!file) return setError('Select your PDF report first.');
    if (!consent) return setError('Please read and accept the processing notice.');
    setError(''); setResult(null); setDoctors([]); setLoading(true);
    const data = new FormData();
    data.append('report', file);
    data.append('consent', 'true');
    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: data });
      const body = await readApiJson(response, 'Report analysis');
      setResult(body);
      setActiveTab('all');
    } catch (err) { setError(err.message || 'Analysis request failed.'); }
    finally { setLoading(false); }
  }

  async function findDoctors() {
    if (!result) return;
    setDoctorError(''); setDoctors([]); setDoctorStatus('locating');
    if (!navigator.geolocation) { setDoctorError('Location is not supported in this browser.'); setDoctorStatus('error'); return; }
    navigator.geolocation.getCurrentPosition(async position => {
      setDoctorStatus('loading');
      try {
        const response = await fetch('/api/doctors', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude, specialty: result.recommendedSpecialty || 'General Physician' }),
        });
        const body = await readApiJson(response, 'Nearby care search');
        setDoctors(body.doctors || []); setDoctorStatus('complete');
      } catch (err) { setDoctorStatus('error'); setDoctorError(err.message || 'Doctor search unavailable.'); }
    }, err => { setDoctorStatus('error'); setDoctorError(err.code === 1 ? 'Location permission denied. Enable browser location permissions to search nearby, or ask your clinician for a referral.' : 'Could not detect your location. Try again when location services are available.'); }, { timeout: 15000, maximumAge: 90000, enableHighAccuracy: false });
  }

  const shownGood = result?.withinRange || [];
  const shownBad = result?.needsReview || [];
  const shownUncertain = result?.uncertain || [];
  const metricTotal = shownGood.length + shownBad.length;

  return (
    <main className="reports-page" id="main">
      <div className="reports-shell content-width">
        <Link to="/" className="reports-back"><ArrowLeft size={16}/> Back to Home</Link>
        <header className="reports-hero">
          <div>
            <p className="eyebrow">HEALTH INFORMATION, MADE CLEARER</p>
            <h1>Understand your <span>medical reports.</span></h1>
            <p>Upload a PDF to see reported values, understand which findings may need a conversation with your doctor, and explore nearby specialists.</p>
            <div className="reports-hero-badges"><span><FileText size={16}/> PDF reports</span><span><Activity size={16}/> Metric-by-metric</span><span><Stethoscope size={16}/> Nearby care</span></div>
          </div>
          <div className="reports-hero-icon" aria-hidden="true"><FileHeart size={92} strokeWidth={1.15}/></div>
        </header>

        <div className="reports-main-grid">
          <section className="reports-upload-box" aria-label="Upload report">
            <span className="reports-section-label">STEP 01</span>
            <h2>Upload your report</h2>
            <p className="subtext">Text-based or scanned PDFs may be accepted by Grok. Complex or low-quality scans may produce incomplete results.</p>
            <form onSubmit={analyze}>
              <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={event => acceptFile(event.target.files?.[0])} />
              <div className="reports-dropzone" role="button" tabIndex={0} onClick={() => inputRef.current?.click()} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inputRef.current?.click(); } }} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); acceptFile(event.dataTransfer.files?.[0]); }}>
                {file ? <><FileCheck2 size={34}/><strong>{file.name}</strong><small>{(file.size/1024/1024).toFixed(2)} MB · Click to replace</small></> : <><UploadCloud size={39}/><strong>Choose a PDF or drag it here</strong><small>PDF only · Up to 8 MB</small></>}
              </div>
              <label className="reports-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>I understand that the PDF will be sent to xAI/Grok for automated analysis. I will use <strong>synthetic test reports only</strong> until real authentication and privacy safeguards are deployed.</span></label>
              <button className="btn btn-primary reports-analyze-btn" type="submit" disabled={!file || !consent || loading}>{loading ? 'Reading your report…' : 'Analyze Report'}{!loading && <ArrowRight size={18}/>}</button>
              {error && <p className="reports-error" role="alert"><XCircle size={17}/>{error}</p>}
            </form>
          </section>
          <aside className="reports-how-box">
            <span className="reports-section-label">WHAT YOU'LL SEE</span>
            <h2>A simpler breakdown</h2>
            <div className="reports-how-list">
              <div><CheckCircle2 className="how-ok" size={24}/><span><strong>Within reference range</strong><small>Values matching the report's printed laboratory ranges</small></span></div>
              <div><ShieldAlert className="how-warn" size={24}/><span><strong>Results to discuss</strong><small>Out-of-range values with easy explanations</small></span></div>
              <div><MapPin className="how-loc" size={24}/><span><strong>Relevant nearby care</strong><small>Up to five community-mapped care options after location permission</small></span></div>
            </div>
            <p className="reports-fineprint">AI interpretations can contain errors. Results do not diagnose illness, and out-of-range results do not always mean disease.</p>
          </aside>
        </div>

        {result && <section className="reports-results" aria-live="polite">
          <div className="reports-result-header"><div><p className="eyebrow">STEP 02 · YOUR REPORT EXPLAINED</p><h2>Your report, at a glance</h2><p>{result.summary}</p></div><span className="reports-type">{result.reportType || 'Medical report'}</span></div>
          <div className="reports-summary-cards">
            <div className="summary-good"><CheckCircle2 size={22}/><span className="summary-number">{shownGood.length}</span><span>Within reported range</span></div>
            <div className="summary-review"><ShieldAlert size={22}/><span className="summary-number">{shownBad.length}</span><span>Needs review</span></div>
            <div className="summary-neutral"><FileText size={22}/><span className="summary-number">{shownUncertain.length}</span><span>Unable to classify</span></div>
          </div>
          <div className="reports-results-top"><h3>Report metrics <small>({metricTotal})</small></h3><div className="reports-filters">{[['all','All'],['review','Needs review'],['good','Within range']].map(([value,label]) => <button key={value} type="button" className={activeTab === value ? 'selected' : ''} onClick={()=>setActiveTab(value)}>{label}</button>)}</div></div>
          {activeTab !== 'good' && shownBad.map((m,i) => <Metric metric={m} key={`review-${i}`} needsReview />)}
          {activeTab !== 'review' && shownGood.map((m,i) => <Metric metric={m} key={`good-${i}`} />)}
          {metricTotal === 0 && <p className="reports-empty">No reliably classifiable numerical metrics were found. Review the summary and consult a clinician for interpretation.</p>}
          {shownUncertain.length > 0 && <div className="reports-uncertain"><h3>Values needing clarification</h3>{shownUncertain.map((m,i)=><p key={i}><strong>{m.name}:</strong> {m.reason}</p>)}</div>}
          <div className="reports-limitations"><ShieldAlert size={20}/><p><strong>What the attention score means:</strong> A 0–100 AI-generated review-priority indicator, <strong>not a medically validated risk score or disease probability.</strong> It should never determine emergency treatment or replace clinical judgement. {result.limitations}</p></div>
          {result.nextSteps?.length > 0 && <div className="reports-next"><h3>Questions and next steps</h3><ul>{result.nextSteps.map((text,i) => <li key={i}>{text}</li>)}</ul></div>}
        </section>}

        {result && <section className="reports-doctors">
          <div className="doctor-section-intro"><div><span className="reports-section-label">STEP 03</span><h2>Find the right conversation</h2><p>Based on your report, consider discussing these findings with a <strong>{result.recommendedSpecialty || 'General Physician'}</strong>.</p></div><button type="button" className="btn btn-primary" onClick={findDoctors} disabled={doctorStatus === 'loading' || doctorStatus === 'locating'}><LocateFixed size={18}/>{doctorStatus === 'loading' || doctorStatus === 'locating' ? 'Finding nearby options…' : 'Find 5 options near me'}</button></div>
          <p className="doctor-privacy">Location is requested only when you click. Your location and suggested specialty go to our app server. Only rounded coordinates and a general healthcare search are sent to the public OpenStreetMap Overpass service — not your specialty, report or lab values. OSM listings may be incomplete.</p>
          {doctorError && <p className="reports-error" role="alert">{doctorError}</p>}
          {doctorStatus === 'complete' && <><p className="doctor-clarity">These are community-mapped practices, clinics or hospitals, not independently verified doctors or a quality ranking. The specialty is confirmed only as an OSM tag when marked “listed”, not by medical registration checks. Always call before visiting.</p>{doctors.length ? <div className="doctor-list">{doctors.map((d,i) => <DoctorCard doctor={d} index={i} key={d.id || i}/>)}</div> : <p className="reports-empty">No relevant listings were found nearby. Try again later or ask a local hospital or clinician for a referral. OpenStreetMap coverage varies by area.</p>}<p className="doctor-attribution">Listing data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> · via public Overpass API</p></>}
        </section>}
      </div>
    </main>
  );
}
