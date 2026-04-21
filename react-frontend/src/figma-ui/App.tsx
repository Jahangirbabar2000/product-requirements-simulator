import { useState, useCallback } from 'react';
import { InputForm } from './components/InputForm';
import { ProgressDashboard } from './components/ProgressDashboard';
import { ResultsView } from './components/ResultsView';
import { PastRunsView } from './components/PastRunsView';
import { ReproducibilityInputForm } from './components/ReproducibilityInputForm';
import { ReproducibilityProgress } from './components/ReproducibilityProgress';
import { ReproducibilityView, ReproducibilityResults } from './components/ReproducibilityView';
import { submitAnalysis, ProgressData, getResults, startReproducibilityTest } from './lib/api';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

type AppState = 'input' | 'progress' | 'results' | 'past-runs' | 'repro-input' | 'repro-progress' | 'repro-results';

export default function App() {
  const [state, setState] = useState<AppState>('input');
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultsData, setResultsData] = useState<ProgressData | null>(null);
  const [reproResults, setReproResults] = useState<ReproducibilityResults | null>(null);

  const handleStartAnalysis = async (formData: {
    product: string;
    design_context: string;
    n_agents: number;
  }) => {
    try {
      const response = await submitAnalysis(formData);
      setJobId(response.job_id);
      setState('progress');
      toast.success('Analysis started!');
    } catch (error) {
      toast.error('Failed to start analysis. Please try again.');
      console.error('Error starting analysis:', error);
    }
  };

  const handleAnalysisComplete = async (data: ProgressData) => {
    // Fetch final results if available
    if (jobId) {
      try {
        const finalResults = await getResults(jobId);
        if (finalResults) {
          setResultsData(finalResults);
        } else {
          setResultsData(data);
        }
      } catch (error) {
        console.error('Error fetching final results:', error);
        setResultsData(data);
      }
    } else {
      setResultsData(data);
    }
    setState('results');
    toast.success('Analysis completed!');
  };

  const handleStartNew = () => {
    setState('input');
    setJobId(null);
    setResultsData(null);
    setReproResults(null);
  };

  // Reproducibility testing handlers
  const handleStartReproTest = async (formData: {
    product: string;
    design_context: string;
    n_agents: number;
    n_iterations: number;
  }) => {
    console.log('handleStartReproTest called with:', formData);
    try {
      const response = await startReproducibilityTest(formData);
      console.log('startReproducibilityTest returned:', response);
      setJobId(response.job_id);
      console.log('Setting state to repro-progress');
      setState('repro-progress');
      toast.success('Reproducibility test started!');
    } catch (error) {
      console.error('handleStartReproTest error:', error);
      toast.error('Failed to start reproducibility test. Please try again.');
      console.error('Error starting reproducibility test:', error);
    }
  };

  const handleReproComplete = useCallback((results: ReproducibilityResults) => {
    console.log('handleReproComplete called with:', results);
    setReproResults(results);
    setState('repro-results');
    toast.success('Reproducibility test completed!');
  }, []);

  const handleGoToReproTest = () => {
    setState('repro-input');
  };

  const handleBackToMain = () => {
    setState('input');
  };

  const handleViewPastRuns = () => {
    setState('past-runs');
  };

  const handleOpenPastRun = useCallback((data: ProgressData) => {
    setResultsData(data);
    setState('results');
    setJobId(null);
  }, []);

  return (
    <>
      {state === 'input' && (
        <InputForm 
          onSubmit={handleStartAnalysis} 
          onReproducibilityTest={handleGoToReproTest}
          onViewPastRuns={handleViewPastRuns}
        />
      )}
      
      {state === 'progress' && jobId && (
        <ProgressDashboard 
          jobId={jobId} 
          onComplete={handleAnalysisComplete}
        />
      )}
      
      {state === 'results' && resultsData && (
        <ResultsView 
          data={resultsData}
          onStartNew={handleStartNew}
          onViewPastRuns={handleViewPastRuns}
        />
      )}

      {state === 'past-runs' && (
        <PastRunsView 
          onBack={handleBackToMain}
          onOpenRun={handleOpenPastRun}
        />
      )}

      {state === 'repro-input' && (
        <ReproducibilityInputForm 
          onSubmit={handleStartReproTest}
          onBack={handleBackToMain}
        />
      )}

      {state === 'repro-progress' && jobId && (
        <ReproducibilityProgress 
          jobId={jobId}
          onComplete={handleReproComplete}
        />
      )}

      {state === 'repro-results' && reproResults && (
        <ReproducibilityView 
          results={reproResults}
          onStartNew={handleStartNew}
        />
      )}

      <Toaster theme="light" />
    </>
  );
}
