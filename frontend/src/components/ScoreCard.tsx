import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';

interface ScoreCardProps {
  score: number;
  verdict: string;
  penaltyBreakdown?: Record<string, number>;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ score, verdict, penaltyBreakdown }) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (!score) return;

    let start = 0;
    const end = score;
    const duration = 1000;
    const increment = end / (duration / 16);

    const interval = setInterval(() => {
      start += increment;
      if (start >= end) {
        start = end;
        clearInterval(interval);
      }
      setAnimatedScore(Math.floor(start));
    }, 16);

    return () => clearInterval(interval);
  }, [score]);

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

  const formatPenaltyItem = (key: string, value: number) => {
    const labels: Record<string, string> = {
      "Critical": "Critical Risk",
      "High": "High Risk", 
      "Medium": "Medium Risk",
      "Low": "Low Risk",
      "escalation": "Escalation",
      "diversity": "Diversity"
    };
    
    let count = "";
    if (key !== "escalation" && key !== "diversity") {
      const weight = key === "Critical" ? 25 : key === "High" ? 15 : key === "Medium" ? 8 : 3;
      count = ` (${Math.floor(value / weight)})`;
    }
    
    return `${labels[key] || key}${count} → -${value}`;
  };

  return (
    <div className={`card p-6 border-2 ${getScoreBgColor(score)} Score transition-all duration-300 ease-in-out`}>
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
        <div className={`text-5xl font-black ${getScoreColor(score)} transition-all duration-300 ease-in-out`}>
          {animatedScore}
        </div>
      </div>
      
      {penaltyBreakdown && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="space-y-1">
            {Object.entries(penaltyBreakdown)
              .filter(([_, value]) => value > 0)
              .map(([key, value]) => (
                <div key={key} className="text-xs text-gray-400">
                  {formatPenaltyItem(key, value)}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoreCard;
