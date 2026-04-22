import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { AnalysisResponse } from '../types';
import ScoreCard from './ScoreCard';
import RiskList from './RiskList';
import Suggestions from './Suggestions';

interface ResultsDashboardProps {
  data: AnalysisResponse | null;
  loading: boolean;
  stage: string;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  data,
  loading,
  stage,
}) => {
  if (loading) {
    return (
      <div className="card p-8 min-h-[400px] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-accent mb-4" />
        <p className="text-text-primary font-medium mb-2">Analyzing contract...</p>
        <p className="text-text-secondary text-sm text-center">{stage}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card p-8 min-h-[400px] flex flex-col items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-text-secondary mb-4 opacity-50" />
        <p className="text-text-primary font-medium mb-2">No Analysis Yet</p>
        <p className="text-text-secondary text-sm text-center">
          Enter a contract and click "Analyze Contract" to see AI-powered insights
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ScoreCard score={data.score.overall} verdict={data.score.verdict} />
      
      <RiskList risks={data.risks} />
      
      <Suggestions suggestions={data.suggestions} />
      
      {data.clauses.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Contract Preview
          </h3>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {data.clauses.slice(0, 5).map((clause, index) => (
              <div key={index} className="p-3 bg-card-hover rounded border border-border">
                <div className="text-xs text-text-secondary mb-1">
                  {clause.type} - Clause {clause.position + 1}
                </div>
                <div className="text-sm text-text-primary line-clamp-3">
                  {clause.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsDashboard;
