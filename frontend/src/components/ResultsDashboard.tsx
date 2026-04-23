import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { AnalysisResponse } from '../types';
import ScoreCard from './ScoreCard';
import RiskList from './RiskList';
import Suggestions from './Suggestions';

const formatStage = (stage: string) => {
  if (!stage) return "";
  return stage
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
};

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
      <div className="card p-8 min-h-[400px] flex flex-col items-center justify-center Dashboard">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
        <p className="text-gray-100 font-medium mb-2">Analyzing contract...</p>
        <p className="text-gray-400 text-sm text-center">{stage}</p>
        {stage && (
          <div className="mt-4 mb-4 text-sm text-gray-400">
            <p className="animate-pulse">⚙️ {formatStage(stage)}</p>
          </div>
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card p-8 min-h-[400px] flex flex-col items-center justify-center Dashboard">
        <AlertTriangle className="w-12 h-12 text-gray-400 mb-4 opacity-50" />
        <p className="text-gray-100 font-medium mb-2">No Analysis Yet</p>
        <p className="text-gray-400 text-sm text-center">
          Enter a contract and click "Analyze Contract" to see AI-powered insights
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 Results transition-all duration-300 ease-in-out">
      <ScoreCard score={data.score.overall} verdict={data.score.verdict} penaltyBreakdown={data.score.penalty_breakdown} />
      
      <RiskList risks={data.risks} />
      
      <Suggestions suggestions={data.suggestions} />
      
      {data.clauses.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">
            Contract Preview
          </h3>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {data.clauses.slice(0, 5).map((clause, index) => (
              <div key={index} className="p-3 bg-gray-800 rounded border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">
                  {clause.type} - Clause {clause.position + 1}
                </div>
                <div className="text-sm text-gray-100 line-clamp-3">
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
