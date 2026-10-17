/**
 * Adapter recreated because the uploaded archive omitted src/services/organDonationAgent.ts.
 * Sandbox use only; never use AI to certify clinical suitability or allocate organs.
 */
const configured = (key: string) => Boolean(process.env[key]?.trim());
const alertsEnabled = () => process.env.ENABLE_EXTERNAL_NOTIFICATIONS === 'true';
const safeError = (label: string) => ({ success: false, error: `${label} is not configured. This is a local synthetic-data demonstration.` });

export function getAgentConfigStatus() {
  return { mistral: configured('MISTRAL_API_KEY'), resend: configured('RESEND_API_KEY') && alertsEnabled(), telegram: configured('TELEGRAM_BOT_TOKEN') && alertsEnabled(), externalNotificationsEnabled: alertsEnabled(), notice: 'AI responses are educational only, not clinical donor viability decisions.' };
}
export async function evaluateWithMistral(donor: any) {
  if (!configured('MISTRAL_API_KEY')) throw new Error('MISTRAL_API_KEY is missing; set it in the project-root .env to enable educational AI evaluation.');
  const organ = String(donor?.organ || 'Unspecified').slice(0,60);
  const bloodGroup = String(donor?.bloodGroup || 'Unspecified').slice(0,12);
  const condition = String(donor?.organCondition || '').slice(0,160);
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.MISTRAL_API_KEY}`},
    body: JSON.stringify({model: process.env.MISTRAL_MODEL || 'mistral-small-latest',response_format:{type:'json_object'},messages:[
      {role:'system',content:'You are an educational organ donation information helper. Provided data is hypothetical/synthetic. DO NOT issue medical suitability or certification decisions, risk percentages, or allocation decisions. Return valid JSON: {"viable":false,"viabilityScore":null,"priorityLevel":"CLINICIAN_REVIEW_REQUIRED","ischemiaRisk":"Unknown","clinicalSummary":"...","recommendedAction":"Refer to qualified transplant professionals"}.'},
      {role:'user',content:`Synthetic organ: ${organ}, blood group: ${bloodGroup}, notes: ${condition}. Briefly explain which additional clinical tests and review would be required.`}
    ]}), signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`Mistral API returned HTTP ${response.status}; verify key, model and credits.`);
  const data=await response.json();
  const parsed=JSON.parse(data.choices?.[0]?.message?.content || '{}');
  return {viable:false,viabilityScore:null,priorityLevel:'CLINICIAN_REVIEW_REQUIRED',ischemiaRisk:'Unknown',clinicalSummary:String(parsed.clinicalSummary || 'Requires professional review.'),recommendedAction:'Arrange qualified transplant-clinician evaluation; this tool does not determine donor eligibility.',notice:'Educational explanation only — not a clinical assessment.'};
}
export async function getTelegramBotInfo() {
  if (!configured('TELEGRAM_BOT_TOKEN')) return {ok:false,error:'Telegram not configured'};
  const response=await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`,{signal:AbortSignal.timeout(8000)});
  return response.json();
}
export async function getLatestTelegramChatId() {
  // Never expose private subscriber chat IDs from a public unauthenticated endpoint.
  return {ok:false,error:'Chat auto-detection disabled for privacy. Configure a test chat ID server-side.'};
}
export async function sendResendEmail(donorData: any, _evaluation: any) {
  if (!alertsEnabled()) return safeError('External email dispatch');
  if (!configured('RESEND_API_KEY') || !process.env.DEFAULT_HOSPITAL_EMAIL) return safeError('Resend / approved test recipient');
  // Intentionally no contact or health data transmitted from an unauthenticated public endpoint.
  return {success:false,error:'Outbound email disabled until server-side authorization, consent, and vetted test-recipient allowlisting are implemented.'};
}
export async function sendTelegramAlert(_donorData: any, _evaluation: any) {
  return {success:false,error:'Outbound Telegram alerts disabled until authentication and explicit opt-in are implemented.'};
}
export async function runOrganDonationAgent(donorData: any) {
  const evaluation = await evaluateWithMistral(donorData);
  return { success:true, evaluation, actionsTriggered: {email:await sendResendEmail(donorData,evaluation),telegram:await sendTelegramAlert(donorData,evaluation)}, notice:'Synthetic-data-only educational assistant. No medical clearance or messages sent.' };
}
