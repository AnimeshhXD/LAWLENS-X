import React from 'react';
import { AlertTriangle, XCircle, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import type { ClauseRisk } from '../types';

interface RiskListProps {
  risks: ClauseRisk[];
  onRiskClick?: (risk: ClauseRisk) => void;
  simpleMode?: boolean;
}

const RiskList: React.FC<RiskListProps> = ({ risks, onRiskClick, simpleMode = false }) => {
  const impactIcon = (impact?: string | null) => {
    if (impact === 'Money Risk') return '💰';
    if (impact === 'Legal Risk') return '⚖️';
    if (impact === 'Lock-in Risk') return '🔒';
    if (impact === 'Control Risk') return '🎛';
    return '⚠️';
  };
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

  // Prioritize high-impact risks, but keep graceful fallback.
  const criticalRisks = risks.filter(r => ['High', 'Critical'].includes(r.level));
  const displayRisks = criticalRisks.length > 0 ? criticalRisks : risks.slice(0, 3);

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-100">Top Contract Risks</h3>
      </div>
      
      {displayRisks.length === 0 ? (
        <p className="text-gray-400 text-sm">No critical risks detected.</p>
      ) : (
        <div className="space-y-3">
          {displayRisks.map((risk, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${getRiskColor(risk.level)} transition-all duration-300 ease-in-out`}
              onClick={() => onRiskClick?.(risk)}
            >
              <div className="flex items-center space-x-2 mb-2">
                {getRiskIcon(risk.level)}
                <span className={`font-medium ${getRiskTextColor(risk.level)}`}>{risk.level} Risk</span>
              </div>
              {risk.label && (
                <p className="text-sm font-semibold text-gray-100 mb-2">{risk.label}</p>
              )}
              {risk.clause_type && (
                <p className="text-xs text-gray-400 mb-2">Clause Type: {risk.clause_type}</p>
              )}
              {risk.impact_level && (
                <p className="text-xs text-gray-300 mb-2">{impactIcon(risk.impact_level)} {risk.impact_level}</p>
              )}
              {risk.matched_sentence && (
                <div className="text-xs text-gray-300 bg-gray-900/40 border border-gray-700 rounded p-2 mb-2">
                  <span className="text-gray-400">Matched sentence: </span>
                  "{risk.matched_sentence}"
                </div>
              )}
              <ul className="space-y-1 text-sm">
                {risk.reasons.slice(0, 2).map((reason, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="w-1 h-1 rounded-full bg-current mt-2 flex-shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
              {risk.what_this_means && (
                <p className="text-sm text-indigo-200 mt-2"><span className="text-indigo-300 font-medium">{simpleMode ? "Explain like I'm 5:" : "What this means:"}</span> {risk.what_this_means}</p>
              )}
              {risk.real_world_risk && (
                <p className="text-sm text-red-200 mt-1"><span className="text-red-300 font-medium">Real-world risk:</span> {risk.real_world_risk}</p>
              )}
              {risk.real_world_scenario && (
                <p className="text-sm text-gray-200 mt-1"><span className="text-gray-300 font-medium">Scenario:</span> {risk.real_world_scenario}</p>
              )}
              {(risk.what_should_user_do?.length ?? 0) > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-emerald-300 mb-1">What should you do:</p>
                  <ul className="space-y-1 text-sm text-emerald-100">
                    {(risk.what_should_user_do ?? []).slice(0, 3).map((action, actionIdx) => (
                      <li key={actionIdx}>- {action}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(risk.negotiation_actions?.length ?? 0) > 0 && (
                <div className="mt-2 space-y-1">
                  {risk.negotiation_actions?.slice(0, 2).map((a, actionIdx) => (
                    <div key={actionIdx} className="text-xs bg-gray-900/40 border border-gray-700 rounded p-2">
                      <div className="text-gray-300">{a.priority} priority: {a.action}</div>
                      <div className="text-gray-100 italic mt-1">"{a.negotiation_line}"</div>
                      <button
                        type="button"
                        className="mt-2 text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(a.negotiation_line);
                        }}
                      >
                        <Copy className="w-3 h-3" /> Copy line
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RiskList;
