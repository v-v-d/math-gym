import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const isProd = process.env.NODE_ENV === 'production' || process.env.REQUIRE_ANALYTICS_POLICY === '1';
const forced = process.env.ANALYTICS_POLICY_MODE;
let policy = forced ? { mode: forced, decisionOwner:'local-build', approvedAt:new Date(0).toISOString(), jurisdictionScope:'local/test', policyReference:'env override' } : null;
if (!policy && existsSync('config/analytics-policy.json')) policy = JSON.parse(readFileSync('config/analytics-policy.json','utf8'));
if (!policy) {
  if (isProd) throw new Error('Production build requires config/analytics-policy.json');
  policy = { mode:'disabled', decisionOwner:'development-default', approvedAt:new Date(0).toISOString(), jurisdictionScope:'local/test', policyReference:'development default' };
}
const modes = new Set(['approved-basis','consent-gated','disabled']);
for (const key of ['mode','decisionOwner','approvedAt','jurisdictionScope','policyReference']) if (!policy[key] || typeof policy[key] !== 'string') throw new Error(`Invalid analytics policy: ${key}`);
if (!modes.has(policy.mode)) throw new Error('Invalid analytics policy mode');
if (Number.isNaN(Date.parse(policy.approvedAt))) throw new Error('Invalid approvedAt');
mkdirSync('src/generated',{recursive:true});
writeFileSync('src/generated/analytics-policy.json', JSON.stringify(policy,null,2)+'\n');
