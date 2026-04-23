import React from 'react';
import { AlertTriangle, XCircle, AlertCircle, CheckCircle } from 'lucide-react';
import type { ClauseRisk } from '../types';

interface RiskListProps {
  risks: ClauseRisk[];
}

const RiskList: React.FC<RiskListProps> = ({ risks }) => {
  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'High':
      case 'Critical':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'Medium':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High':
      case 'Critical':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'Medium':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'text-green-500 bg-green-500/10 border-green-500/20';
    }
  };

  const getRiskTextColor = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'text-red-500';
      case 'High':
        return 'text-orange-400';
      case 'Medium':
        return 'text-yellow-400';
      case 'Low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  // Filter for critical risks first, then show top 3 total
  const criticalRisks = risks.filter(r => ['High', 'Critical'].includes(r.level));
  const displayRisks = criticalRisks.length > 0 ? criticalRisks : risks.slice(0, 3);

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-100">Critical Risks</h3>
      </div>
      
      {displayRisks.length === 0 ? (
        <p className="text-gray-400 text-sm">No critical risks detected.</p>
      ) : (
        <div className="space-y-3">
          {displayRisks.map((risk, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${getRiskColor(risk.level)} transition-all duration-300 ease-in-out`}
            >
              <div className="flex items-center space-x-2 mb-2">
                {getRiskIcon(risk.level)}
                <span className={`font-medium ${getRiskTextColor(risk.level)}`}>{risk.level} Risk</span>
              </div>
              <ul className="space-y-1 text-sm">
                {risk.reasons.slice(0, 2).map((reason, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="w-1 h-1 rounded-full bg-current mt-2 flex-shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RiskList;
