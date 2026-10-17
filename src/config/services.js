// The landing page is independent from the three existing projects.
// Later, either point to their deployed frontends using .env,
// or mount all apps together and replace these routes.
export const services = [
  {
    id: 'neuroscan',
    name: 'NeuroScan',
    path: '/neuroscan',
    externalUrl: '', // Integrated locally at /neuroscan
    badge: 'AI-assisted',
    headline: 'Early detection. Healthier brains.',
    description: 'Upload brain scans for AI-assisted insights that can support informed conversations with healthcare professionals.',
    action: 'Go to NeuroScan',
    longDescription: 'NeuroScan is a separate module for brain scan exploration and AI-assisted review. Results are informational and must be interpreted by a qualified clinician.',
  },
  {
    id: 'donation',
    name: 'Organ Donation',
    path: '/organ-donation',
    externalUrl: '', // Integrated locally at /organ-donation
    badge: 'Give hope',
    headline: 'Give hope. Save lives.',
    description: 'Learn about organ donation, understand the process and find trustworthy resources for making an informed choice.',
    action: 'Explore Organ Donation',
    longDescription: 'Explore donation awareness, frequently asked questions and reliable next steps. Formal donor registration should follow the applicable official process.',
  },
  {
    id: 'reports',
    name: 'Reports Analysis',
    path: '/reports-analysis',
    externalUrl: import.meta.env.VITE_REPORT_ANALYSIS_URL?.trim() || '',
    badge: 'Made clearer',
    headline: 'Understand your health better.',
    description: 'Turn complex medical reports into clearer, easier-to-read explanations with AI-assisted analysis.',
    action: 'Analyse Reports',
    longDescription: 'Reports Analysis helps explain the terms, trends and values that appear in medical reports. It does not replace diagnosis or clinical advice.',
  },
];

export function serviceHref(service) {
  return service.externalUrl || service.path;
}

export function isExternalService(service) {
  return Boolean(service.externalUrl);
}
