import { Agent } from '../lib/api';
import { Calendar, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { motion } from 'framer-motion';

interface AgentCardProps {
  agent: Agent;
  index: number;
}

// Gender icon and color mapping
const genderConfig = {
  Male: { color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
  Female: { color: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800' },
  'Non-binary': { color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' }
};

function hashToIndex(str: string): number {
  const s = str || 'Agent';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 99) + 1;
}

function getAvatarUrl(agent: { name: string; gender?: string }): string {
  const index = hashToIndex(agent.name);
  const gender = (agent.gender || '').toLowerCase();
  const folder = gender === 'female' ? 'women' : 'men';
  return `https://randomuser.me/api/portraits/${folder}/${index}.jpg`;
}

export function AgentCard({ agent, index }: AgentCardProps) {
  const avatarUrl = getAvatarUrl(agent);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className="h-full shadow-card-sm hover:shadow-card transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <img
              src={avatarUrl}
              alt={agent.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-primary/20 flex-shrink-0"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 hidden">
              <span className="text-xs font-bold text-primary">
                {agent.name.split(/\s+/).map((s) => s[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">{agent.name}</CardTitle>
              {/* Age and Gender Chips */}
              {(agent.age || agent.gender) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {agent.age && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700">
                      <Calendar className="w-3 h-3" />
                      {agent.age} yrs
                    </span>
                  )}
                  {agent.gender && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${genderConfig[agent.gender]?.color || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      <Users className="w-3 h-3" />
                      {agent.gender}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-foreground/90">{agent.description}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="eyebrow mb-1">Reasoning</p>
            <p className="text-xs text-foreground/80 italic">{agent.reasoning}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
