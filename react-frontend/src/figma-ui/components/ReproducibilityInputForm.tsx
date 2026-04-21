import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { HeatmapSlider } from './ui/heatmap-slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { RefreshCw, Lightbulb, ArrowLeft, Clock } from 'lucide-react';
import { estimatePipelineSeconds, formatDuration } from '../lib/timeEstimate';

const DEFAULT_SUGGESTIONS = [
  { product: 'Fitness Tracking App', context: 'A mobile app for tracking workouts, nutrition, and health metrics. Target users are health-conscious individuals aged 25-45.' },
  { product: 'Team Collaboration Tool', context: 'A web-based platform for remote teams to communicate and manage projects. Focus on small to medium businesses.' },
  { product: 'E-learning Platform', context: 'An online learning platform for professional skill development targeting working professionals.' },
];

interface ReproducibilityInputFormProps {
  onSubmit: (data: { 
    product: string; 
    design_context: string; 
    n_agents: number; 
    n_iterations: number 
  }) => void;
  onBack: () => void;
}

export function ReproducibilityInputForm({ onSubmit, onBack }: ReproducibilityInputFormProps) {
  const [product, setProduct] = useState('');
  const [designContext, setDesignContext] = useState('');
  const [nAgents, setNAgents] = useState([3]);
  const [nIterations, setNIterations] = useState([3]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted', { product, designContext, nAgents: nAgents[0], nIterations: nIterations[0] });
    if (product.trim() && designContext.trim()) {
      console.log('Calling onSubmit');
      onSubmit({
        product: product.trim(),
        design_context: designContext.trim(),
        n_agents: nAgents[0],
        n_iterations: nIterations[0]
      });
    } else {
      console.log('Form validation failed - product or context empty');
    }
  };

  const handleSuggestionClick = (suggestedProduct: string, suggestedContext: string) => {
    setProduct(suggestedProduct);
    setDesignContext(suggestedContext);
  };

  // Total estimated time = single-run estimate * iterations
  const singleRunSeconds = estimatePipelineSeconds(nAgents[0]);
  const totalSeconds = singleRunSeconds * nIterations[0];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
            <RefreshCw className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Reproducibility Test</h1>
          <p className="text-muted-foreground">
            Test the consistency of AI-generated requirements across multiple runs
          </p>
        </div>

        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Configure Test</CardTitle>
                <CardDescription>
                  Run the pipeline multiple times to measure reproducibility
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Quick suggestions */}
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Quick Start</Label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_SUGGESTIONS.map((suggestion, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestionClick(suggestion.product, suggestion.context)}
                      className="text-xs"
                    >
                      <Lightbulb className="h-3 w-3 mr-1" />
                      {suggestion.product}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Product Name */}
              <div className="space-y-2">
                <Label htmlFor="product">Product Name</Label>
                <Input
                  id="product"
                  placeholder="e.g., Fitness Tracking App"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  required
                />
              </div>

              {/* Design Context */}
              <div className="space-y-2">
                <Label htmlFor="context">Design Context</Label>
                <Textarea
                  id="context"
                  placeholder="Describe the product and target users"
                  value={designContext}
                  onChange={(e) => setDesignContext(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              {/* Number of Agents */}
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <Label>Agents per Iteration</Label>
                  <span className="text-sm font-medium text-foreground">{nAgents[0]} agents</span>
                </div>
                <HeatmapSlider
                  value={nAgents}
                  onValueChange={setNAgents}
                  min={1}
                  max={5}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  More agents = more comprehensive but longer test
                </p>
              </div>

              {/* Number of Iterations */}
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <Label>Number of Iterations</Label>
                  <span className="text-sm font-medium text-foreground">{nIterations[0]} iterations</span>
                </div>
                <HeatmapSlider
                  value={nIterations}
                  onValueChange={setNIterations}
                  min={2}
                  max={10}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  More iterations = better reproducibility measurement (minimum 2)
                </p>
              </div>

              {/* Time Estimate */}
              <div className="bg-muted/50 rounded-lg p-4 border border-border/70">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Estimated Time</span>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    ≈ {formatDuration(totalSeconds)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {nAgents[0]} agents × {nIterations[0]} iterations = {nAgents[0] * nIterations[0]} pipeline runs
                  {' · '}~{formatDuration(singleRunSeconds)} per run
                </p>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={!product.trim() || !designContext.trim()}
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Start Reproducibility Test
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
