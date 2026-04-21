import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import {
  Activity,
  Clock,
  DollarSign,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Database
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    total_duration: number;
    total_api_calls: number;
    successful_calls: number;
    failed_calls: number;
    total_tokens: number;
    total_cost: number;
    avg_latency: number;
    tokens_per_second: number;
  };
  stage_breakdown: {
    [stage: string]: {
      duration: number;
      items: number;
      api_calls: number;
      tokens: number;
      cost: number;
    };
  };
  agent_performance: Array<{
    agent_id: string;
    total_duration: number;
    total_cost: number;
    total_tokens: number;
    stages: {
      [stage: string]: {
        duration: number;
        tokens: number;
        cost: number;
      };
    };
  }>;
  api_calls: Array<{
    call_id: string;
    stage: string;
    agent_id: string | null;
    timestamp: string;
    duration: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    model: string;
    cost: number;
    status: string;
    error: string | null;
    retry_count: number;
  }>;
  activity_log: Array<{
    timestamp: string;
    type: string;
    message: string;
    metadata: any;
  }>;
  extremes: {
    slowest_call: any;
    fastest_call: any;
    most_expensive_agent: any;
    fastest_agent: any;
  };
}

interface AnalyticsViewProps {
  analytics: AnalyticsData;
  agents: string[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ analytics, agents }) => {
  const { overview, stage_breakdown, agent_performance, activity_log, extremes } = analytics;

  // Format currency
  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;
  
  // Format duration
  const formatDuration = (seconds: number) => `${seconds.toFixed(2)}s`;
  
  // Format tokens with commas
  const formatTokens = (tokens: number) => tokens.toLocaleString();

  // Get stage display name
  const getStageDisplayName = (stage: string) => {
    const stageNames: { [key: string]: string } = {
      'agent_generation': 'Agent Generation',
      'experience_simulation': 'Experience Simulation',
      'interviews': 'Interviews',
      'need_extraction': 'Need Extraction',
    };
    return stageNames[stage] || stage;
  };

  // Calculate max duration for progress bars
  const maxDuration = Math.max(...agent_performance.map(a => a.total_duration));

  // Get activity icon and color
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'api_success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'api_error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'stage_complete':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.total_api_calls}</div>
            <p className="text-xs text-muted-foreground">
              {overview.successful_calls} successful, {overview.failed_calls} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(overview.total_cost)}</div>
            <p className="text-xs text-muted-foreground">
              Estimated API cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(overview.avg_latency)}</div>
            <p className="text-xs text-muted-foreground">
              Per API call
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTokens(overview.total_tokens)}</div>
            <p className="text-xs text-muted-foreground">
              {overview.tokens_per_second.toFixed(0)} tokens/sec
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Agent Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Per-Agent Performance</CardTitle>
          <CardDescription>Processing time and cost breakdown for each agent</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead className="text-right">Generation</TableHead>
                <TableHead className="text-right">Experience</TableHead>
                <TableHead className="text-right">Interview</TableHead>
                <TableHead className="text-right">Needs</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agent_performance.map((agent, idx) => {
                const agentName = agents[idx] ? agents[idx].split(',')[0] : `Agent ${idx + 1}`;
                const isFastest = agent.agent_id === extremes.fastest_agent?.agent_id;
                const isSlowest = agent.agent_id === extremes.most_expensive_agent?.agent_id;

                return (
                  <TableRow key={agent.agent_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{agentName}</span>
                        {isFastest && <Badge variant="secondary" className="text-xs">⭐ Best</Badge>}
                        {isSlowest && <Badge variant="outline" className="text-xs">⚠️ Slow</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      <div>{formatDuration(agent.stages.agent_generation?.duration || 0)}</div>
                      <div className="text-muted-foreground">
                        {formatTokens(agent.stages.agent_generation?.tokens || 0)} tok
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      <div>{formatDuration(agent.stages.experience_simulation?.duration || 0)}</div>
                      <div className="text-muted-foreground">
                        {formatTokens(agent.stages.experience_simulation?.tokens || 0)} tok
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      <div>{formatDuration(agent.stages.interviews?.duration || 0)}</div>
                      <div className="text-muted-foreground">
                        {formatTokens(agent.stages.interviews?.tokens || 0)} tok
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      <div>{formatDuration(agent.stages.need_extraction?.duration || 0)}</div>
                      <div className="text-muted-foreground">
                        {formatTokens(agent.stages.need_extraction?.tokens || 0)} tok
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatDuration(agent.total_duration)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCost(agent.total_cost)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stage Duration & Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Duration Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Stage Duration Breakdown</CardTitle>
            <CardDescription>Time spent in each pipeline stage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stage_breakdown).map(([stage, data]: [string, any]) => {
              const percentage = (data.duration / overview.total_duration) * 100;
              return (
                <div key={stage} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{getStageDisplayName(stage)}</span>
                    <span className="text-muted-foreground">
                      {formatDuration(data.duration)} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
            <Separator className="my-4" />
            <div className="flex justify-between text-sm font-semibold">
              <span>Total Pipeline Time</span>
              <span>{formatDuration(overview.total_duration)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown by Stage</CardTitle>
            <CardDescription>Estimated API costs per stage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stage_breakdown).map(([stage, data]: [string, any]) => {
              const percentage = (data.cost / overview.total_cost) * 100;
              return (
                <div key={stage} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{getStageDisplayName(stage)}</span>
                    <span className="text-muted-foreground">
                      {formatCost(data.cost)} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
            <Separator className="my-4" />
            <div className="flex justify-between text-sm font-semibold">
              <span>Total Cost</span>
              <span>{formatCost(overview.total_cost)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Processing Time Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Processing Time Comparison</CardTitle>
          <CardDescription>Visual comparison of total processing time per agent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {agent_performance.map((agent, idx) => {
            const agentName = agents[idx] ? agents[idx].split(',')[0] : `Agent ${idx + 1}`;
            const percentage = (agent.total_duration / maxDuration) * 100;
            const isFastest = agent.agent_id === extremes.fastest_agent?.agent_id;

            return (
              <div key={agent.agent_id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{agentName}</span>
                    {isFastest && <span className="text-green-400">⭐ FASTEST</span>}
                  </div>
                  <span className="text-muted-foreground">
                    {formatDuration(agent.total_duration)} ({formatCost(agent.total_cost)})
                  </span>
                </div>
                <Progress 
                  value={percentage} 
                  className={`h-3 ${isFastest ? 'bg-green-100 dark:bg-green-900/30' : ''}`}
                />
                <div className="text-xs text-muted-foreground">
                  Gen: {formatDuration(agent.stages.agent_generation?.duration || 0)} | 
                  Exp: {formatDuration(agent.stages.experience_simulation?.duration || 0)} | 
                  Int: {formatDuration(agent.stages.interviews?.duration || 0)} | 
                  Needs: {formatDuration(agent.stages.need_extraction?.duration || 0)}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Live Activity Log</CardTitle>
          <CardDescription>Chronological record of pipeline execution events</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            <div className="space-y-3">
              {activity_log.slice().reverse().map((log, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5">{getActivityIcon(log.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {log.type}
                      </Badge>
                    </div>
                    <p className="mt-1">{log.message}</p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {log.metadata.duration && `${formatDuration(log.metadata.duration)}`}
                        {log.metadata.tokens && ` • ${formatTokens(log.metadata.tokens)} tokens`}
                        {log.metadata.cost && ` • ${formatCost(log.metadata.cost)}`}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>Key performance metrics and comparisons</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="font-medium">Fastest Agent:</span>
                <span className="text-muted-foreground">
                  {extremes.fastest_agent ? 
                    `Agent ${parseInt(extremes.fastest_agent.agent_id.replace('agent_', '')) + 1} - ${formatDuration(extremes.fastest_agent.total_duration)}` :
                    'N/A'
                  }
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="font-medium">Slowest Agent:</span>
                <span className="text-muted-foreground">
                  {extremes.most_expensive_agent ?
                    `Agent ${parseInt(extremes.most_expensive_agent.agent_id.replace('agent_', '')) + 1} - ${formatDuration(extremes.most_expensive_agent.total_duration)}` :
                    'N/A'
                  }
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Processing Speed:</span>
                <span className="text-muted-foreground">
                  {overview.tokens_per_second.toFixed(1)} tokens/second
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-purple-500" />
                <span className="font-medium">Most Expensive:</span>
                <span className="text-muted-foreground">
                  {extremes.most_expensive_agent ?
                    `Agent ${parseInt(extremes.most_expensive_agent.agent_id.replace('agent_', '')) + 1} - ${formatCost(extremes.most_expensive_agent.total_cost)}` :
                    'N/A'
                  }
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
