import { useState, useMemo } from 'react';
import { ProgressData } from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  Download,
  User,
  MessageSquare,
  Lightbulb,
  BarChart3,
  FileText,
} from 'lucide-react';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { jsPDF } from 'jspdf';
import { AnalyticsView } from './AnalyticsView';
import { TreeView, TreeNodeData } from './TreeView';
import { PersonaProfile } from './PersonaProfile';

interface ResultsViewProps {
  data: ProgressData;
  onStartNew: () => void;
  onViewPastRuns?: () => void;
}

// Helper to get avatar URL for an agent (same as PersonaProfile)
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

export function ResultsView({ data, onStartNew, onViewPastRuns }: ResultsViewProps) {
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const { agents, experiences, interviews, needs } = data.intermediate_results;

  // Calculate summary statistics
  const needsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    needs.forEach(need => {
      counts[need.category] = (counts[need.category] || 0) + 1;
    });
    return counts;
  }, [needs]);

  const needsByPriority = useMemo(() => {
    const counts: Record<string, number> = {};
    needs.forEach(need => {
      counts[need.priority] = (counts[need.priority] || 0) + 1;
    });
    return counts;
  }, [needs]);

  // Chart data for visual summary
  const categoryChartData = useMemo(
    () =>
      Object.entries(needsByCategory)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    [needsByCategory]
  );
  const priorityChartData = useMemo(
    () =>
      ['High', 'Medium', 'Low']
        .filter(p => (needsByPriority[p] ?? 0) > 0)
        .map(priority => ({
          name: priority,
          value: needsByPriority[priority] ?? 0
        })),
    [needsByPriority]
  );
  const PRIORITY_COLORS = { High: '#f59e0b', Medium: '#14b8a6', Low: '#64748b' };
  const chartTooltipStyle = { borderRadius: 8, background: '#ffffff', border: '1px solid #e2e2e6', color: '#0a0a0b', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' };

  const toggleCard = (index: number) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const runInput = data.run_input;

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    let y = 20;
    const lineHeight = 7;
    const margin = 20;
    // A4 width in mm (jsPDF default)
    const pageWidth = 210;
    const maxWidth = pageWidth - (margin * 2);

    doc.setFontSize(18);
    doc.text('NeedGen – Requirements Report', margin, y, { maxWidth });
    y += lineHeight * 2;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Input', margin, y, { maxWidth });
    y += lineHeight;
    doc.setFont(undefined, 'normal');
    if (runInput) {
      const productLines = doc.splitTextToSize(`Product: ${runInput.product}`, maxWidth);
      doc.text(productLines, margin, y, { maxWidth });
      y += lineHeight * productLines.length;
      
      const contextLines = doc.splitTextToSize(`Design context: ${runInput.design_context}`, maxWidth);
      doc.text(contextLines, margin, y, { maxWidth });
      y += lineHeight * contextLines.length;
      
      doc.text(`Agents: ${runInput.n_agents}  |  Mode: ${runInput.pipeline_mode}`, margin, y, { maxWidth });
      y += lineHeight * 1.5;
    } else {
      doc.text('(Run input not available)', margin, y, { maxWidth });
      y += lineHeight * 1.5;
    }

    doc.setFont(undefined, 'bold');
    doc.text(`Extracted needs (${needs.length})`, margin, y, { maxWidth });
    y += lineHeight;
    doc.setFont(undefined, 'normal');

    needs.forEach((need, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(10);
      const needText = `${i + 1}. [${need.category}] ${need.need_statement}`;
      const needLines = doc.splitTextToSize(needText, maxWidth);
      doc.text(needLines, margin, y, { maxWidth });
      y += lineHeight * needLines.length;
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const detailText = `   Priority: ${need.priority}  |  Design: ${need.design_implication}`;
      const detailLines = doc.splitTextToSize(detailText, maxWidth);
      doc.text(detailLines, margin, y, { maxWidth });
      doc.setTextColor(0, 0, 0);
      y += lineHeight * detailLines.length + lineHeight * 0.2;
    });

    doc.save(`needgen-report-${runInput?.product?.replace(/\s+/g, '-') || 'run'}-${Date.now()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="mb-1">Analysis Results</h1>
              <p className="text-sm text-muted-foreground">
                Generated {agents.length} personas and extracted {needs.length} latent needs
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleDownloadPDF} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download PDF Report
              </Button>
              {onViewPastRuns && (
                <Button onClick={onViewPastRuns} variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Past runs
                </Button>
              )}
              <Button onClick={onStartNew}>
                Start New Analysis
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Run input (what was submitted for this run) */}
        {runInput && (
          <section className="border border-border rounded-xl p-6 bg-card shadow-card">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Run input
            </h2>
            <Card className="bg-muted/20 border">
              <CardContent className="pt-6">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="font-medium text-muted-foreground">Product</dt>
                    <dd className="mt-1">{runInput.product}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">Design context</dt>
                    <dd className="mt-1">{runInput.design_context}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">Agents</dt>
                    <dd className="mt-1">{runInput.n_agents}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">Pipeline mode</dt>
                    <dd className="mt-1">{runInput.pipeline_mode}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Executive Summary (after run input) */}
        <section className="border border-border rounded-xl p-6 bg-card shadow-card">
          <h2 className="mb-4">Executive Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Total Needs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl">{needs.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Latent needs identified</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  By Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">High</span>
                    <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      {needsByPriority.High || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Medium</span>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                      {needsByPriority.Medium || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Low</span>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                      {needsByPriority.Low || 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Top Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(needsByCategory)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 3)
                    .map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{category}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Detailed Results */}
        <section className="border border-border rounded-xl p-6 bg-card shadow-card">
          <Tabs defaultValue="needs" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="needs">
                <Lightbulb className="w-4 h-4 mr-2" />
                Needs
              </TabsTrigger>
              <TabsTrigger value="agents">
                <User className="w-4 h-4 mr-2" />
                Agents
              </TabsTrigger>
              <TabsTrigger value="interviews">
                <MessageSquare className="w-4 h-4 mr-2" />
                Interviews
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Needs Tab: Flip cards */}
            <TabsContent value="needs" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {needs.map((need, index) => {
                  const isFlipped = flippedCards.has(index);
                  const categoryColors: Record<string, string> = {
                    Functional: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                    Usability: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
                    Performance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
                    Safety: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                    Emotional: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
                    Social: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                    Accessibility: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
                  };
                  const priorityColors: Record<string, string> = {
                    High: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                    Medium: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
                    Low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
                  };
                  return (
                    <div
                      key={index}
                      className="relative h-48 cursor-pointer"
                      style={{ perspective: '1000px' }}
                      onClick={() => toggleCard(index)}
                    >
                      <div
                        className="relative w-full h-full transition-transform duration-500"
                        style={{
                          transformStyle: 'preserve-3d',
                          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        }}
                      >
                        {/* Front: Need statement */}
                        <div
                          className="absolute inset-0 bg-card border border-border rounded-lg p-4 flex flex-col justify-between shadow-card-sm hover:shadow-card transition-shadow"
                          style={{ backfaceVisibility: 'hidden' }}
                        >
                          <div className="flex-1 flex flex-col justify-center">
                            <p className="text-sm font-medium leading-relaxed">{need.need_statement}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <Badge className={categoryColors[need.category] || 'bg-gray-100 text-gray-800'} variant="secondary">
                              {need.category}
                            </Badge>
                            <Badge className={priorityColors[need.priority] || 'bg-gray-100 text-gray-800'} variant="secondary">
                              {need.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 text-center">Click to flip</p>
                        </div>
                        {/* Back: Design implication */}
                        <div
                          className="absolute inset-0 bg-primary/5 border border-primary/20 rounded-lg p-4 flex flex-col justify-center shadow-card-sm"
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                          }}
                        >
                          <p className="eyebrow mb-2">Design Implication</p>
                          <p className="text-sm leading-relaxed">{need.design_implication}</p>
                          <p className="text-xs text-muted-foreground mt-3 text-center">Click to flip back</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Agents Tab: Persona-style tree */}
            <TabsContent value="agents" className="space-y-4 mt-6">
              <div className="bg-card border border-border rounded-lg p-4">
                <TreeView
                  data={agents.map((agent): TreeNodeData => {
                    const avatarUrl = getAvatarUrl(agent);
                    return {
                      id: `agent-${agent.id}`,
                      label: (
                        <div className="flex items-center gap-3 py-1">
                          <img
                            src={avatarUrl}
                            alt={agent.name}
                            className="w-10 h-10 rounded-full border-2 border-primary/20 shrink-0 object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div className="w-10 h-10 rounded-full border-2 border-primary/20 bg-primary/5 shrink-0 hidden items-center justify-center text-sm font-bold text-primary">
                            {agent.name.split(/\s+/).map((s) => s[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-base whitespace-normal break-words">{agent.name}</span>
                            {(agent.occupation || agent.location) && (
                              <span className="text-xs text-muted-foreground whitespace-normal break-words">
                                {[agent.occupation, agent.location].filter(Boolean).join(' • ')}
                              </span>
                            )}
                          </div>
                        </div>
                      ),
                      content: (
                        <div className="py-6 px-2 md:px-4">
                          <PersonaProfile agent={agent} />
                        </div>
                      ),
                    };
                  })}
                />
              </div>
            </TabsContent>

            {/* Interviews Tab: Collapsible tree by agent, then Q&A */}
            <TabsContent value="interviews" className="space-y-4 mt-6">
              <div className="bg-card border border-border rounded-lg p-4">
                <TreeView
                  data={interviews.map((interview): TreeNodeData => {
                    const agent = agents.find((a) => a.id === interview.agent_id);
                    const avatarUrl = agent ? getAvatarUrl(agent) : '';
                    return {
                      id: `int-${interview.agent_id}`,
                      label: (
                        <div className="flex items-center gap-3 py-1">
                          {avatarUrl && (
                            <>
                              <img
                                src={avatarUrl}
                                alt={agent?.name || `Agent ${interview.agent_id + 1}`}
                                className="w-10 h-10 rounded-full border-2 border-primary/20 shrink-0 object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                              <div className="w-10 h-10 rounded-full border-2 border-primary/20 bg-primary/5 shrink-0 hidden items-center justify-center text-sm font-bold text-primary">
                                {(agent?.name || `Agent ${interview.agent_id + 1}`).split(/\s+/).map((s) => s[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                            </>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-base whitespace-normal break-words">{agent?.name ?? `Agent ${interview.agent_id + 1}`}</span>
                            {(agent?.occupation || agent?.location) && (
                              <span className="text-xs text-muted-foreground whitespace-normal break-words">
                                {[agent?.occupation, agent?.location].filter(Boolean).join(' • ')}
                              </span>
                            )}
                          </div>
                        </div>
                      ),
                      icon: <MessageSquare className="w-4 h-4" />,
                      children: interview.interview.map((qa, idx): TreeNodeData => ({
                        id: `int-${interview.agent_id}-qa-${idx}`,
                        label: qa.question,
                        content: (
                          <div className="pl-2 border-l-2 border-primary/30 py-1">
                            <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">Answer</p>
                            <p>{qa.answer}</p>
                          </div>
                        ),
                      })),
                    };
                  })}
                />
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="mt-6">
              {data.analytics ? (
                <AnalyticsView
                  analytics={data.analytics}
                  agents={agents.map(a => a.name || '')}
                />
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Analytics data not available for this run
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </section>

        <Separator />

        {/* Visual Summary: charts at the very end */}
        <section className="border-2 border-border rounded-lg p-6 bg-card space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Visual Summary
          </h2>
          <Card className="bg-muted/30 border border-border">
            <CardContent className="pt-6">
              <p className="text-muted-foreground leading-relaxed">
                From <strong>{agents.length}</strong> user persona{agents.length !== 1 ? 's' : ''}, we conducted{' '}
                <strong>{interviews.length}</strong> interview{interviews.length !== 1 ? 's' : ''}, and extracted{' '}
                <strong>{needs.length}</strong> latent need{needs.length !== 1 ? 's' : ''} across{' '}
                <strong>{Object.keys(needsByCategory).length}</strong> categories. Below is the distribution by category and priority.
              </p>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Needs by Category</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Distribution of extracted needs across categories
                </p>
              </CardHeader>
              <CardContent className="pt-2">
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={categoryChartData} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} angle={categoryChartData.length > 4 ? -25 : 0} textAnchor={categoryChartData.length > 4 ? 'end' : 'middle'} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Needs" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No category data</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Needs by Priority</CardTitle>
                <p className="text-sm text-muted-foreground">
                  High, medium, and low priority breakdown
                </p>
              </CardHeader>
              <CardContent className="pt-2">
                {priorityChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={priorityChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {priorityChartData.map((entry, index) => (
                          <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name as keyof typeof PRIORITY_COLORS] ?? '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [value, 'Needs']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No priority data</div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

