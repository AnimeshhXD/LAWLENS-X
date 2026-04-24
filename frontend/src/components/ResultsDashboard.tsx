import React from 'react';
import { AlertTriangle, Loader2, Copy, Download } from 'lucide-react';
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
  const [selectedSentence, setSelectedSentence] = React.useState<string>('');
  const [simpleMode, setSimpleMode] = React.useState(false);
  const previewContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const itemHeight = 122;
  const viewportHeight = 360;

  const severityWeight = (level?: string) => {
    if (level === 'Critical') return 4;
    if (level === 'High') return 3;
    if (level === 'Medium') return 2;
    return 1;
  };

  const riskByClauseId = React.useMemo(() => {
    const map: Record<string, { level: string; label?: string | null }> = {};
    data?.risks.forEach((risk) => {
      const current = map[risk.clause_id];
      if (!current || severityWeight(risk.level) > severityWeight(current.level)) {
        map[risk.clause_id] = { level: risk.level, label: risk.label };
      }
    });
    return map;
  }, [data]);

  const getSeverityClass = (level?: string) => {
    if (level === 'Critical') return 'bg-red-500';
    if (level === 'High') return 'bg-orange-500';
    if (level === 'Medium') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const buildNegotiationScript = React.useCallback(() => {
    if (!data) return '';
    const lines = [
      'Negotiation Script',
      `Verdict: ${data.score.verdict}`,
      '',
    ];
    const picks = data.risks
      .filter((risk) => ['Critical', 'High'].includes(risk.level))
      .flatMap((risk) => risk.negotiation_actions ?? [])
      .slice(0, 8);
    picks.forEach((item, idx) => {
      lines.push(`${idx + 1}. [${item.priority}] ${item.action}`);
      lines.push(`   Say: "${item.negotiation_line}"`);
    });
    if (!picks.length) {
      lines.push('No high-priority negotiation lines found. Review moderate risks before signing.');
    }
    return lines.join('\n');
  }, [data]);

  const handleCopyScript = React.useCallback(() => {
    const script = buildNegotiationScript();
    if (script) void navigator.clipboard.writeText(script);
  }, [buildNegotiationScript]);

  const handleDownloadScript = React.useCallback(() => {
    const script = buildNegotiationScript();
    if (!script) return;
    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'lawlens-negotiation-script.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  }, [buildNegotiationScript]);

  const highlightText = (content: string, sentence?: string | null) => {
    if (!sentence || !content.includes(sentence)) return content;
    const parts = content.split(sentence);
    return (
      <>
        {parts[0]}
        <mark className="bg-yellow-500/40 text-gray-100 rounded px-1">{sentence}</mark>
        {parts.slice(1).join(sentence)}
      </>
    );
  };

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

  const totalClauses = data.clauses.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 3);
  const endIndex = Math.min(totalClauses, startIndex + Math.ceil(viewportHeight / itemHeight) + 8);
  const visibleClauses = data.clauses.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 Results transition-all duration-300 ease-in-out">
      <ScoreCard score={data.score.overall} verdict={data.score.verdict} penaltyBreakdown={data.score.penalty_breakdown} />

      <div className="card p-4">
        <div className="text-sm text-gray-200">Confidence: <span className="text-indigo-300 font-semibold">{data.score.confidence_score ?? 0}%</span></div>
        {data.analysis_meta?.llm_degraded && (
          <div className="text-xs text-yellow-300 mt-1">AI enrichment partially unavailable. Some risks are rule-based fallbacks.</div>
        )}
        {data.analysis_meta?.legal_disclaimer && (
          <div className="text-xs text-gray-400 mt-2">{data.analysis_meta.legal_disclaimer}</div>
        )}
      </div>

      {(data.score.what_should_user_do?.length ?? 0) > 0 && (
        <div className="card p-6 border border-emerald-500/20 bg-emerald-500/5">
          <h3 className="text-lg font-semibold text-emerald-300 mb-2">Decision Box</h3>
          <p className="text-sm text-gray-200 mb-2">Verdict: {data.score.verdict}</p>
          <ul className="space-y-1 text-sm text-emerald-100">
            {(data.score.what_should_user_do ?? []).slice(0, 5).map((action, idx) => (
              <li key={idx}>- {action}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-4">
        <label className="inline-flex items-center gap-2 text-sm text-gray-200">
          <input type="checkbox" checked={simpleMode} onChange={(e) => setSimpleMode(e.target.checked)} />
          Explain Like I'm 5
        </label>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-100">Clause Risk Heatmap</h3>
          <div className="text-xs text-gray-400">Click a block to jump</div>
        </div>
        <div className="grid grid-cols-12 gap-1">
          {data.clauses.map((clause) => (
            <button
              key={clause.id}
              type="button"
              title={`${clause.type} • ${riskByClauseId[clause.id]?.level ?? 'Low'}`}
              className={`h-5 rounded ${getSeverityClass(riskByClauseId[clause.id]?.level)} ${selectedSentence && clause.text.includes(selectedSentence) ? 'ring-2 ring-indigo-400' : ''}`}
              onClick={() => {
                const idx = data.clauses.findIndex((c) => c.id === clause.id);
                if (idx >= 0 && previewContainerRef.current) {
                  previewContainerRef.current.scrollTop = idx * itemHeight;
                }
              }}
            />
          ))}
        </div>
      </div>
      
      <RiskList
        risks={data.risks}
        simpleMode={simpleMode}
        onRiskClick={(risk) => {
          setSelectedSentence(risk.matched_sentence ?? '');
          const idx = data.clauses.findIndex((c) => c.id === risk.clause_id);
          if (idx >= 0 && previewContainerRef.current) {
            previewContainerRef.current.scrollTop = idx * itemHeight;
          }
        }}
      />

      {(data.chat_summary?.length ?? 0) > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-3">Chat Summary</h3>
          <ul className="space-y-1 text-sm text-gray-200">
            {data.chat_summary?.map((line, idx) => <li key={idx}>{line}</li>)}
          </ul>
        </div>
      )}

      {(data.simulations?.length ?? 0) > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-3">What If Scenarios</h3>
          <div className="space-y-3">
            {data.simulations?.map((sim, idx) => (
              <div key={idx} className="bg-gray-900/40 border border-gray-700 rounded p-3">
                <div className="text-sm text-indigo-200 mb-2">Scenario: {sim.scenario}</div>
                <ul className="space-y-1 text-xs text-gray-200">
                  {sim.outcomes.slice(0, 3).map((o, oIdx) => (
                    <li key={oIdx}>- {o.scenario}: {o.impact} ({o.likelihood})</li>
                  ))}
                </ul>
                {sim.probability_notes && (
                  <div className="text-xs text-gray-400 mt-2">Notes: {sim.probability_notes}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <Suggestions suggestions={data.suggestions} />

      <div className="card p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-100">Negotiation Script</h3>
          <div className="flex gap-2">
            <button type="button" onClick={handleCopyScript} className="text-xs px-2 py-1 rounded bg-indigo-600/30 text-indigo-200 inline-flex items-center gap-1">
              <Copy className="w-3 h-3" /> Copy
            </button>
            <button type="button" onClick={handleDownloadScript} className="text-xs px-2 py-1 rounded bg-emerald-600/30 text-emerald-200 inline-flex items-center gap-1">
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
        </div>
        <pre className="text-xs text-gray-200 whitespace-pre-wrap bg-gray-900/40 border border-gray-700 rounded p-3">
          {buildNegotiationScript()}
        </pre>
      </div>
      
      {data.clauses.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">
            Contract Preview
          </h3>
          <div
            ref={previewContainerRef}
            className="overflow-y-auto space-y-2"
            style={{ maxHeight: `${viewportHeight}px` }}
            onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
          >
            <div style={{ height: `${totalClauses * itemHeight}px`, position: 'relative' }}>
              {visibleClauses.map((clause, localIndex) => {
                const index = startIndex + localIndex;
                return (
              <div
                key={clause.id}
                className="p-3 bg-gray-800 rounded border border-gray-700 absolute left-0 right-0"
                style={{ top: `${index * itemHeight}px`, height: `${itemHeight - 8}px` }}
              >
                <div className="text-xs text-gray-400 mb-1">
                  {clause.type} - Clause {clause.position + 1}
                </div>
                <div className="text-sm text-gray-100 line-clamp-3">
                  {highlightText(clause.text, selectedSentence)}
                </div>
                {clause.clause_intent && (
                  <div className="text-xs text-indigo-300 mt-2">Intent: {clause.clause_intent}</div>
                )}
              </div>
              );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsDashboard;
