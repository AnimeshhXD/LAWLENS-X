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
        return <XCircle className="w-4 h-4 text-danger" />;
      case 'Medium':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      default:
        return <CheckCircle className="w-4 h-4 text-success" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High':
      case 'Critical':
        return 'text-danger bg-danger/10 border-danger/20';
      case 'Medium':
        return 'text-warning bg-warning/10 border-warning/20';
      default:
        return 'text-success bg-success/10 border-success/20';
    }
  };

  // Filter for critical risks first, then show top 3 total
  const criticalRisks = risks.filter(r => ['High', 'Critical'].includes(r.level));
  const displayRisks = criticalRisks.length > 0 ? criticalRisks : risks.slice(0, 3);

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-warning" />
        <h3 className="text-lg font-semibold text-text-primary">Critical Risks</h3>
      </div>
      
      {displayRisks.length === 0 ? (
        <p className="text-text-secondary text-sm">No critical risks detected.</p>
      ) : (
        <div className="space-y-3">
          {displayRisks.map((risk, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${getRiskColor(risk.level)}`}
            >
              <div className="flex items-center space-x-2 mb-2">
                {getRiskIcon(risk.level)}
                <span className="font-medium">{risk.level} Risk</span>
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
