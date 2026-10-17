import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  ArrowRight, Brain, CheckCircle2, FileText, Heart, HeartHandshake,
  Eye, EyeOff, LockKeyhole, LogOut, Menu, Search, ShieldCheck, Sparkles, UserRound, UsersRound, X,
} from 'lucide-react';
import BrandLogo from './components/BrandLogo.jsx';
import IntegratedModulePage from './pages/IntegratedModulePage.jsx';
import HeroArtwork from './components/HeroArtwork.jsx';
import { services, isExternalService, serviceHref } from './config/services.js';

const iconFor = {
  neuroscan: Brain,
  donation: Heart,
  reports: FileText,
};

function ServiceLink({ service, className, children, onClick, ariaLabel }) {
  const props = { className, onClick, 'aria-label': ariaLabel };
  if (isExternalService(service)) {
    return <a href={serviceHref(service)} {...props}>{children}</a>;
  }
  return <Link to={serviceHref(service)} {...props}>{children}</Link>;
}

function Header({ onOpenSearch, onOpenSignIn, currentUser }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMobileOpen(false), [location.pathname, location.hash]);

  return (
    <header className="site-header">
      <div className="header-inner content-width">
        <BrandLogo />
        <nav className={`nav-links ${mobileOpen ? 'nav-open' : ''}`} id="main-navigation" aria-label="Main navigation">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>Home</NavLink>
          {services.map((service) => (
            <ServiceLink key={service.id} service={service} className="nav-link" onClick={() => setMobileOpen(false)}>{service.name}</ServiceLink>
          ))}
          <Link to="/#about" className="nav-link" onClick={() => setMobileOpen(false)}>About</Link>
          <button className="nav-link nav-auth" type="button" onClick={() => { setMobileOpen(false); onOpenSignIn(); }}>{currentUser ? 'My account (User1)' : 'Sign In'}</button>
        </nav>
        <div className="header-actions">
          <button className="icon-action search-trigger" type="button" aria-label="Search services" title="Search services" onClick={onOpenSearch}><Search size={23} strokeWidth={2} /></button>
          <button className="btn btn-outline sign-in-btn" type="button" onClick={onOpenSignIn}>
            {currentUser ? <><UserRound size={17} aria-hidden="true" /> {currentUser.name}</> : 'Sign In'}
          </button>
          <Link className="btn btn-primary header-get-started" to="/#tools">Get Started <ArrowRight size={19} strokeWidth={2} /></Link>
          <button type="button" className="icon-action mobile-menu-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-controls="main-navigation" aria-expanded={mobileOpen}>
            {mobileOpen ? <X size={25} /> : <Menu size={25} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function ServiceCard({ service }) {
  const Icon = iconFor[service.id];
  return (
    <article className={`service-card service-${service.id}`}>
      <div className="card-head">
        <div className="card-icon"><Icon aria-hidden="true" size={43} strokeWidth={1.85} /></div>
        <span className="service-tag">{service.badge}</span>
      </div>
      <div className="service-watermark" aria-hidden="true"><Icon size={168} strokeWidth={1.2} /></div>
      <div className="card-content">
        <h3>{service.name}</h3>
        <p className="card-subtitle">{service.headline}</p>
        <p className="card-description">{service.description}</p>
      </div>
      <div className="card-actions">
        <ServiceLink service={service} className="btn card-cta">{service.action}<ArrowRight size={21} strokeWidth={1.8} /></ServiceLink>
        <ServiceLink service={service} className="card-round-link" ariaLabel={`Open ${service.name}`}><ArrowRight size={23} strokeWidth={2} /></ServiceLink>
      </div>
    </article>
  );
}

function BenefitStrip() {
  const benefits = [
    { icon: ShieldCheck, title: 'Privacy-minded', detail: 'Your health deserves careful handling', color: 'blue' },
    { icon: UsersRound, title: 'Simple to Use', detail: 'Designed for all age groups', color: 'coral' },
    { icon: Sparkles, title: 'Clearer Insights', detail: 'Understand complex health information', color: 'green' },
    { icon: Heart, title: 'Real-World Impact', detail: 'For individuals, families and communities', color: 'pink' },
  ];
  return (
    <section className="benefits" aria-labelledby="benefit-title">
      <div className="benefit-heading" id="benefit-title"><span>BUILT FOR EVERYONE</span></div>
      <div className="benefit-list">
        {benefits.map(({ icon: Icon, title, detail, color }) => (
          <div className="benefit-item" key={title}>
            <span className={`benefit-icon benefit-${color}`}><Icon size={29} strokeWidth={1.8} aria-hidden="true" /></span>
            <span className="benefit-text"><strong>{title}</strong><small>{detail}</small></span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HomePage() {
  useEffect(() => { document.title = 'DoosraJeevan — Smarter Care, Brighter Tomorrows'; }, []);
  return (
    <>
      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-wash" aria-hidden="true" />
          <div className="hero-inner content-width">
            <div className="hero-copy">
              <p className="eyebrow">ONE PLATFORM. HEALTHIER TOMORROWS.</p>
              <h1 id="hero-title">Smarter Care,<br /><span className="highlight-coral">Brighter</span> Tomorrows.</h1>
              <p className="hero-description">AI-assisted tools for brain health, organ donation awareness and clearer medical report insights — simple, approachable and accessible to everyone.</p>
              <div className="hero-buttons">
                <Link to="/#tools" className="btn btn-primary hero-primary">Explore Our Tools <ArrowRight size={20} /></Link>
                <Link to="/#about" className="btn btn-outline hero-secondary">Learn More</Link>
              </div>
            </div>
            <HeroArtwork />
          </div>
        </section>

        <section id="tools" className="tools-section content-width" aria-labelledby="tools-heading">
          <h2 className="sr-only" id="tools-heading">Choose a healthcare tool</h2>
          <div className="service-grid">
            {services.map((service) => <ServiceCard key={service.id} service={service} />)}
          </div>
        </section>

        <div className="content-width"><BenefitStrip /></div>

        <section className="about-banner content-width" id="about" aria-labelledby="about-title">
          <div>
            <p className="eyebrow">A HEALTHIER TOMORROW</p>
            <h2 id="about-title">Technology, care and community — together.</h2>
            <p>Three useful services in one welcoming place. Pick what you need, understand your options, and take the next step at your own pace.</p>
          </div>
          <Link to="/#how-it-works" className="btn btn-primary about-cta">Learn More <ArrowRight size={20} /></Link>
        </section>

        <section className="how-section content-width" id="how-it-works" aria-labelledby="how-title">
          <div className="how-intro"><p className="eyebrow">SIMPLE BY DESIGN</p><h2 id="how-title">Here when you need a little clarity.</h2><p>Choose the right service without having to navigate a complicated healthcare portal.</p></div>
          <div className="how-steps">
            <div><span className="step-number">01</span><h3>Choose a tool</h3><p>Start with brain health, donation information or medical reports.</p></div>
            <div><span className="step-number">02</span><h3>Follow clear steps</h3><p>Each service is focused on one task, with accessible guidance.</p></div>
            <div><span className="step-number">03</span><h3>Stay informed</h3><p>Use what you learn to support conversations and decisions with professionals.</p></div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="content-width footer-inner">
        <div><BrandLogo /><p>Care begins with understanding.</p></div>
        <div className="footer-links"><Link to="/">Home</Link><Link to="/#tools">Explore services</Link><Link to="/#about">About</Link></div>
      </div>
      <p className="footer-disclaimer content-width">DoosraJeevan is an informational technology platform. AI outputs do not replace medical diagnosis, professional advice, or official organ donation procedures.</p>
    </footer>
  );
}

function ServicePlaceholder({ service }) {
  const Icon = iconFor[service.id];
  useEffect(() => { document.title = `${service.name} | DoosraJeevan`; }, [service]);
  return (
    <main id="main" className="placeholder-page content-width">
      <div className={`placeholder-icon service-${service.id}`}><Icon size={54} strokeWidth={1.5} aria-hidden="true" /></div>
      <span className="eyebrow">DOOSRAJEEVAN SERVICES</span>
      <h1>{service.name}</h1>
      <h2>{service.headline}</h2>
      <p>{service.longDescription}</p>
      <div className="placeholder-note"><CheckCircle2 size={22} aria-hidden="true" /><span>{service.id === 'reports' ? 'Report Analysis is paused for this integration build. NeuroScan and Organ Donation are available to test now.' : 'This module is not available in the current build.'}</span></div>
      <div className="placeholder-actions"><Link className="btn btn-primary" to="/#tools">Back to all services <ArrowRight size={18} /></Link><Link className="btn btn-outline" to="/">Go Home</Link></div>
    </main>
  );
}

function SearchDialog({ onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const results = useMemo(() => services.filter(s => `${s.name} ${s.headline} ${s.description}`.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="dialog search-dialog" role="dialog" aria-modal="true" aria-label="Search healthcare services" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-header"><h2>What can we help with?</h2><button type="button" className="icon-action" onClick={onClose} aria-label="Close search"><X size={23} /></button></div>
        <label className="search-input-wrap"><Search size={20} aria-hidden="true" /><input ref={inputRef} placeholder="Try ‘brain scan’, ‘donation’, or ‘report’" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search for a service" /></label>
        <div className="search-results" aria-live="polite">
          {results.length ? results.map(s => {
            const Icon = iconFor[s.id];
            return <ServiceLink key={s.id} service={s} className="search-result" onClick={onClose}><span className={`search-result-icon service-${s.id}`}><Icon size={24} /></span><span><strong>{s.name}</strong><small>{s.headline}</small></span><ArrowRight size={18} /></ServiceLink>;
          }) : <p className="no-results">No matching service found. Try a different word.</p>}
        </div>
      </div>
    </div>
  );
}

// HACKATHON DEMO LOGIN ONLY — never use a hardcoded PIN for real accounts or medical files.
function SignInDialog({ onClose, onLogin, onLogout, currentUser }) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const pinRef = useRef(null);

  useEffect(() => {
    if (!currentUser) pinRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, currentUser]);

  function handleSubmit(event) {
    event.preventDefault();
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN.');
      return;
    }
    if (pin === '0000') {
      setError('');
      onLogin({ name: 'User1' });
      onClose();
    } else {
      setError('Incorrect password');
      setPin('');
      pinRef.current?.focus();
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="dialog sign-in-dialog" role="dialog" aria-modal="true" aria-labelledby="signin-heading" onMouseDown={e => e.stopPropagation()}>
        <button type="button" className="dialog-x icon-action" onClick={onClose} aria-label="Close sign-in dialog"><X size={22} /></button>
        {currentUser ? (
          <div className="signin-content">
            <div className="signin-symbol"><UserRound size={30} strokeWidth={1.65} /></div>
            <span className="demo-label">DEMO ACCOUNT</span>
            <h2 id="signin-heading">Welcome back, {currentUser.name}!</h2>
            <p>You're signed in to the DoosraJeevan demo. Explore the three healthcare services from the homepage.</p>
            <div className="signin-actions">
              <Link to="/#tools" onClick={onClose} className="btn btn-primary">Explore our tools <ArrowRight size={18} /></Link>
              <button className="btn btn-outline" type="button" onClick={() => { onLogout(); onClose(); }}><LogOut size={17} /> Sign Out</button>
            </div>
          </div>
        ) : (
          <div className="signin-content">
            <div className="signin-symbol"><LockKeyhole size={30} strokeWidth={1.65} /></div>
            <span className="demo-label">WELCOME TO DOOSRAJEEVAN</span>
            <h2 id="signin-heading">Sign in with your PIN</h2>
            <p>Enter your 4-digit PIN to continue to your demo account.</p>
            <form className="pin-form" onSubmit={handleSubmit} noValidate>
              <label className="pin-label" htmlFor="demo-pin">4-digit PIN</label>
              <div className={`pin-input-wrap ${error ? 'pin-invalid' : ''}`}>
                <input
                  id="demo-pin" ref={pinRef} type={showPin ? 'text' : 'password'}
                  inputMode="numeric" autoComplete="off" enterKeyHint="go"
                  maxLength={4} value={pin} placeholder="••••"
                  aria-describedby="pin-help pin-error" aria-invalid={Boolean(error)}
                  onChange={event => { setPin(event.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                />
                <button type="button" className="pin-visibility" onClick={() => setShowPin(!showPin)} aria-label={showPin ? 'Hide PIN' : 'Show PIN'}>
                  {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p id="pin-help" className="pin-hint">For this hackathon demo, use PIN <strong>0000</strong>.</p>
              <div id="pin-error" className="pin-error" role="alert">{error || '\u00A0'}</div>
              <button className="btn btn-primary pin-submit" type="submit">Sign In <ArrowRight size={19} /></button>
            </form>
            <p className="demo-disclaimer">Demo access only. No real account verification or medical file authorization is enabled.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ScrollToHash() {
  const location = useLocation();
  useEffect(() => {
    if (!location.hash) { window.scrollTo({ top: 0, behavior: 'auto' }); return; }
    const id = decodeURIComponent(location.hash.slice(1));
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);
  return null;
}

export default function App() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  // sessionStorage keeps the demo name on refresh within the same tab, not a secure login session.
  const [currentUser, setCurrentUser] = useState(() =>
    window.sessionStorage.getItem('doosrajeevan_demo_user') === 'User1' ? { name: 'User1' } : null
  );
  const handleLogin = (user) => { window.sessionStorage.setItem('doosrajeevan_demo_user', user.name); setCurrentUser(user); };
  const handleLogout = () => { window.sessionStorage.removeItem('doosrajeevan_demo_user'); setCurrentUser(null); };
  const location = useLocation();
  useEffect(() => { setSearchOpen(false); setSignInOpen(false); }, [location.pathname]);
  useEffect(() => { document.body.classList.toggle('modal-open', searchOpen || signInOpen); return () => document.body.classList.remove('modal-open'); }, [searchOpen, signInOpen]);
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <ScrollToHash />
      <Header onOpenSearch={() => setSearchOpen(true)} onOpenSignIn={() => setSignInOpen(true)} currentUser={currentUser} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        {services.map(service => <Route key={service.id} path={service.path} element={<>{!isExternalService(service) && (service.id === 'neuroscan' || service.id === 'donation') ? <IntegratedModulePage service={service} /> : <ServicePlaceholder service={service} />}<Footer /></>} />)}
        <Route path="*" element={<main className="placeholder-page content-width" id="main"><h1>Page not found</h1><p>We couldn't find that page.</p><Link className="btn btn-primary" to="/">Go back home <ArrowRight size={18} /></Link></main>} />
      </Routes>
      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
      {signInOpen && <SignInDialog onClose={() => setSignInOpen(false)} onLogin={handleLogin} onLogout={handleLogout} currentUser={currentUser} />}
    </>
  );
}
