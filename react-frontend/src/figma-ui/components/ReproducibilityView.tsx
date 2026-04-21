import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import {
  BarChart3,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Layers,
  Target,
  MessageSquare,
  ArrowLeft,
  Download
} from 'lucide-react';

// Types for reproducibility test results
export interface ReproducibilityMetrics {
  agent_consistency: {
    age_consistency: number;
    gender_distribution_consistency: number;
    average_agents_per_run: number;
  };
  need_category_consistency: {
    jaccard_similarity: number;
    distribution_similarity: number;
    consistency: number;
    categories_found: string[];
    category_frequency: Record<string, number>;
  };
  need_priority_consistency: {
    consistency: number;
    average_distribution: Record<string, number>;
    high_priority_std: number;
  };
  need_statement_similarity: {
    keyword_similarity: number;
    average_needs_count: number;
    needs_count_std: number;
  };
  interview_consistency: {
    answer_length_consistency: number;
    average_answer_length: number;
  };
  overall_score: {
    score: number;
    rating: string;
    component_scores: {
      agent_consistency: number;
      category_consistency: number;
      priority_consistency: number;
      statement_similarity: number;
      interview_consistency: number;
    };
  };
}

export interface ReproducibilityRun {
  iteration: number;
  success: boolean;
  duration?: number;
  error?: string;
  result?: any;
}

export interface ReproducibilityResults {
  metadata: {
    product: string;
    design_context: string;
    n_agents: number;
    n_iterations: number;
    successful_iterations: number;
    start_time: string;
    end_time: string;
    total_duration: number;
  };
  runs: ReproducibilityRun[];
  metrics: ReproducibilityMetrics;
}

interface ReproducibilityViewProps {
  results: ReproducibilityResults;
  onStartNew: () => void;
}

export function ReproducibilityView({ results, onStartNew }: ReproducibilityViewProps) {
  const { metadata, metrics, runs } = results;

  // Get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 0.85) return 'text-green-400';
    if (score >= 0.70) return 'text-blue-400';
    if (score >= 0.50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRatingBadgeColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Good': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Moderate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toFixed(0)}s`;
  };

  const formatScore = (score: number) => `${(score * 100).toFixed(1)}%`;

  const handleDownload = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reproducibility_test_${metadata.product.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <RefreshCw className="h-8 w-8 text-primary" />
              Reproducibility Test Results
            </h1>
            <p className="text-muted-foreground mt-1">
              Analysis of output consistency across {metadata.n_iterations} iterations
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={onStartNew}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              New Test
            </Button>
          </div>
        </div>

        {/* Overall Score Card */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Overall Reproducibility Score</span>
              <Badge className={getRatingBadgeColor(metrics.overall_score.rating)}>
                {metrics.overall_score.rating}
              </Badge>
            </CardTitle>
            <CardDescription>
              Product: {metadata.product} | Context: {metadata.design_context}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className={`text-6xl font-bold ${getScoreColor(metrics.overall_score.score)}`}>
                {formatScore(metrics.overall_score.score)}
              </div>
              <div className="flex-1">
                <Progress 
                  value={metrics.overall_score.score * 100} 
                  className="h-4"
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold">{metadata.successful_iterations}/{metadata.n_iterations}</div>
                <div className="text-muted-foreground">Successful Runs</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{metadata.n_agents}</div>
                <div className="text-muted-foreground">Agents/Run</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{formatDuration(metadata.total_duration)}</div>
                <div className="text-muted-foreground">Total Time</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{metrics.need_statement_similarity.average_needs_count}</div>
                <div className="text-muted-foreground">Avg Needs</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{metrics.need_category_consistency.categories_found.length}</div>
                <div className="text-muted-foreground">Categories</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Metrics Tabs */}
        <Tabs defaultValue="components" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="components">Component Scores</TabsTrigger>
            <TabsTrigger value="details">Detailed Metrics</TabsTrigger>
            <TabsTrigger value="runs">Individual Runs</TabsTrigger>
          </TabsList>

          {/* Component Scores Tab */}
          <TabsContent value="components" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Agent Consistency */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Agent Consistency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(metrics.overall_score.component_scores.agent_consistency)}`}>
                    {formatScore(metrics.overall_score.component_scores.agent_consistency)}
                  </div>
                  <Progress 
                    value={metrics.overall_score.component_scores.agent_consistency * 100} 
                    className="mt-2 h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    How similar are generated personas across runs
                  </p>
                </CardContent>
              </Card>

              {/* Category Consistency */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    Category Consistency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(metrics.overall_score.component_scores.category_consistency)}`}>
                    {formatScore(metrics.overall_score.component_scores.category_consistency)}
                  </div>
                  <Progress 
                    value={metrics.overall_score.component_scores.category_consistency * 100} 
                    className="mt-2 h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Overlap of need categories identified
                  </p>
                </CardContent>
              </Card>

              {/* Priority Consistency */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    Priority Consistency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(metrics.overall_score.component_scores.priority_consistency)}`}>
                    {formatScore(metrics.overall_score.component_scores.priority_consistency)}
                  </div>
                  <Progress 
                    value={metrics.overall_score.component_scores.priority_consistency * 100} 
                    className="mt-2 h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Consistency of priority distributions
                  </p>
                </CardContent>
              </Card>

              {/* Statement Similarity */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    Statement Similarity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(metrics.overall_score.component_scores.statement_similarity)}`}>
                    {formatScore(metrics.overall_score.component_scores.statement_similarity)}
                  </div>
                  <Progress 
                    value={metrics.overall_score.component_scores.statement_similarity * 100} 
                    className="mt-2 h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Semantic overlap of need statements
                  </p>
                </CardContent>
              </Card>

              {/* Interview Consistency */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    Interview Consistency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(metrics.overall_score.component_scores.interview_consistency)}`}>
                    {formatScore(metrics.overall_score.component_scores.interview_consistency)}
                  </div>
                  <Progress 
                    value={metrics.overall_score.component_scores.interview_consistency * 100} 
                    className="mt-2 h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Consistency of interview responses
                  </p>
                </CardContent>
              </Card>

              {/* Score Legend */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    Score Guide
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-600"></div>
                    <span className="text-sm">Excellent (≥85%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    <span className="text-sm">Good (70-84%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                    <span className="text-sm">Moderate (50-69%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-600"></div>
                    <span className="text-sm">Low (&lt;50%)</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Detailed Metrics Tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Need Categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Need Category Analysis</CardTitle>
                  <CardDescription>Categories found across all runs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Jaccard Similarity:</span>
                        <span className="ml-2 font-semibold">{formatScore(metrics.need_category_consistency.jaccard_similarity)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Distribution Similarity:</span>
                        <span className="ml-2 font-semibold">{formatScore(metrics.need_category_consistency.distribution_similarity)}</span>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Category Frequency (% of runs)</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(metrics.need_category_consistency.category_frequency).map(([cat, freq]) => (
                          <Badge key={cat} variant="secondary">
                            {cat}: {(freq * 100).toFixed(0)}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Priority Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Priority Distribution</CardTitle>
                  <CardDescription>Average priority breakdown across runs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['High', 'Medium', 'Low'].map((priority) => {
                      const value = metrics.need_priority_consistency.average_distribution[priority] || 0;
                      return (
                        <div key={priority}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{priority}</span>
                            <span className="font-semibold">{(value * 100).toFixed(1)}%</span>
                          </div>
                          <Progress value={value * 100} className="h-2" />
                        </div>
                      );
                    })}
                    <Separator />
                    <div className="text-sm text-muted-foreground">
                      High Priority Std Dev: {(metrics.need_priority_consistency.high_priority_std * 100).toFixed(1)}%
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Agent Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Agent Generation Analysis</CardTitle>
                  <CardDescription>Persona consistency metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Age Consistency</p>
                        <p className="text-2xl font-bold">{formatScore(metrics.agent_consistency.age_consistency)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Gender Distribution</p>
                        <p className="text-2xl font-bold">{formatScore(metrics.agent_consistency.gender_distribution_consistency)}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="text-sm">
                      <span className="text-muted-foreground">Avg agents per run:</span>
                      <span className="ml-2 font-semibold">{metrics.agent_consistency.average_agents_per_run.toFixed(1)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Need Statements */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Need Statement Analysis</CardTitle>
                  <CardDescription>Content similarity metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Keyword Similarity</p>
                      <p className="text-2xl font-bold">{formatScore(metrics.need_statement_similarity.keyword_similarity)}</p>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Avg Needs/Run:</span>
                        <span className="ml-2 font-semibold">{metrics.need_statement_similarity.average_needs_count}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Std Dev:</span>
                        <span className="ml-2 font-semibold">±{metrics.need_statement_similarity.needs_count_std}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Individual Runs Tab */}
          <TabsContent value="runs">
            <Card>
              <CardHeader>
                <CardTitle>Individual Run Results</CardTitle>
                <CardDescription>
                  Status and duration of each pipeline iteration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {runs.map((run) => (
                      <div
                        key={run.iteration}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          run.success ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/40' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {run.success ? (
                            <CheckCircle className="h-5 w-5 text-green-400" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-400" />
                          )}
                          <div>
                            <p className="font-medium">Iteration {run.iteration}</p>
                            {run.error && (
                              <p className="text-sm text-red-600">{run.error}</p>
                            )}
                          </div>
                        </div>
                        {run.success && run.duration && (
                          <Badge variant="secondary">
                            {formatDuration(run.duration)}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
