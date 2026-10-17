// DoosraJeevan: full-page navigation into the integrated local modules.
// Module apps are mounted through Vite proxy, not embedded inside iframes.
export const services = [
  { id: 'neuroscan', name: 'NeuroScan', path: '/modules/neuro/', badge: '',
    headline: '', description: '', action: 'Open NeuroScan' },
  { id: 'donation', name: 'Organ Donation', path: '/modules/organ/', badge: '',
    headline: '', description: '', action: 'Open Organ Donation' },
];
export function serviceHref(service) { return service.path; }
export function isExternalService(service) { return true; }
