import React from 'react';
import { TrendingUp } from 'lucide-react';

interface ScoreCardProps {
  score: number;
  verdict: string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ score, verdict }) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 70) return 'bg-green-500/10 border-green-500/20';
    if (score >= 40) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  return (
    <div className={`card p-6 border-2 ${getScoreBgColor(score)}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-400">Risk Score</h3>
          </div>
          <p className={`text-lg font-bold ${getScoreColor(score)}`}>
            {verdict}
          </p>
        </div>
        <div className={`text-5xl font-black ${getScoreColor(score)}`}>
          {score}
        </div>
      </div>
    </div>
  );
};

export default ScoreCard;
