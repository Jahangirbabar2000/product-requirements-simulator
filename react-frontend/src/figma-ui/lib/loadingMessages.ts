export const LOADING_MESSAGES: Record<string, string[]> = {
  'Agent Generation': [
    'Crafting diverse user personas with unique backgrounds and goals',
    'Real user research often uncovers needs users can\'t articulate',
    'Persona diversity helps catch blind spots in product design',
    'The average product team interviews 5-8 users per research cycle',
    'Good personas are based on behavioral patterns, not demographics alone',
    'Nielsen Norman Group recommends 5 users to find 85% of usability issues',
    'Assembling your virtual focus group...',
    'Each persona brings a different lens to your product',
  ],
  'Experience Simulation': [
    'Simulating how each persona would actually use your product',
    'Journey mapping reveals friction points invisible from the inside',
    'Users rarely follow the "happy path" designers intend',
    'Context of use matters as much as the interface itself',
    'Experience simulation is like a cognitive walkthrough on autopilot',
    'The best insights come from watching where users struggle',
    'Walking a mile in your users\' shoes...',
    'Every user brings assumptions shaped by other products they use',
  ],
  'Interview': [
    'Asking the right follow-up questions is an art form',
    'Open-ended questions yield richer insights than yes/no prompts',
    'The "5 Whys" technique uncovers root causes behind surface complaints',
    'Users often say one thing and do another \u2014 interviews catch both',
    'A good interviewer listens 80% and talks 20% of the time',
    'Contextual inquiry combines observation with conversation',
    'Probing deeper into what your users really need...',
    'The most valuable insights often come from unexpected tangents',
  ],
  'Need Extraction': [
    'Clustering related needs to find overarching themes',
    'Latent needs are what users want but can\'t express directly',
    'Affinity diagramming groups hundreds of observations into patterns',
    'Kano model classifies needs as basic, performance, or delighter',
    'Design implications bridge the gap between research and action',
    'Synthesizing raw data into actionable product requirements...',
    'Prioritizing needs by impact and frequency of mention',
    'The best products solve needs users didn\'t know they had',
  ],
  default: [
    'Great products start with understanding real human needs',
    'Requirements elicitation is the foundation of product success',
    'AI-assisted research complements, never replaces, human judgment',
    'This typically takes 2\u20135 minutes depending on complexity',
    'Analyzing patterns across multiple perspectives...',
    'Connecting the dots between user stories and product features',
  ],
};

export function getStageKey(stageNumber: number): string {
  const stageMap: Record<number, string> = {
    1: 'Agent Generation',
    2: 'Experience Simulation',
    3: 'Interview',
    4: 'Need Extraction',
  };
  return stageMap[stageNumber] || 'default';
}
