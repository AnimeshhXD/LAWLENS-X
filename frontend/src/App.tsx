import React, { useState } from 'react';
import { AnalysisResponse } from './types';
import { analyzeContractStream } from './api/client';
import { FileText, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');

  const handleAnalyze = () => {
    if (!text) return;
    setLoading(true); setError(''); setData(null); setStage('Initializing AI Agents...');
    analyzeContractStream(
      { contract_text: text, user_query: query || null },
      (newStage) => setStage(newStage),
      (resultData) => {
        setData(resultData);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center space-x-3 mb-10">
          <ShieldCheck className="w-10 h-10 text-emerald-400" />
          <h1 className="text-3xl font-bold tracking-tight">LawLens-X</h1>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2"><FileText /> Contract Input</h2>
            <textarea
              className="w-full h-64 p-4 rounded-xl bg-gray-900 border border-gray-800 focus:ring-2 focus:ring-emerald-400 outline-none transition-all placeholder:text-gray-600"
              placeholder="Paste contract text here..."
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <input
              type="text"
              className="w-full p-4 rounded-xl bg-gray-900 border border-gray-800 focus:ring-2 focus:ring-emerald-400 outline-none transition-all placeholder:text-gray-600"
              placeholder="Optional: Scenario to simulate (e.g., 'What if we terminate early?')"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || !text}
              className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-gray-950 font-bold transition-colors flex items-center justify-center"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Run AI Analysis Pipelines'}
            </button>
            {error && <div className="text-red-400 bg-red-400/10 p-4 rounded-xl">{error}</div>}
          </section>

          <section className="bg-gray-900 rounded-3xl border border-gray-800 p-8 min-h-[500px]">
            {!data && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center">
                <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
                <p>No analysis run yet.<br/>Compile your AI insights to populate this dashboard.</p>
              </div>
            )}
            {loading && (
              <div className="h-full flex flex-col items-center justify-center text-emerald-400">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <p className="animate-pulse font-medium">{stage}</p>
                <div className="w-48 h-1 bg-gray-800 mt-4 overflow-hidden rounded-full">
                  <div className="h-full bg-emerald-500 w-1/2 animate-[slide_1s_ease-in-out_infinite_alternate]" />
                </div>
              </div>
            )}
            {data && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 rounded-2xl bg-gray-950 border border-gray-800 flex justify-between items-center">
                  <div>
                    <h3 className="text-gray-400">Overall Trust Score</h3>
                    <p className={`text-xl font-bold ${data.score.overall > 70 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {data.score.verdict}
                    </p>
                  </div>
                  <div className="text-5xl font-black text-emerald-400">{data.score.overall}</div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4 text-emerald-400">Critical Risks Identified</h3>
                  <div className="space-y-3">
                    {data.risks.filter(r => ['High', 'Critical'].includes(r.level)).map((r, i) => (
                      <div key={i} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <div className="text-red-400 font-bold mb-1">{r.level} Risk</div>
                        <ul className="list-disc pl-4 text-sm text-gray-300">
                          {r.reasons.map((rs, idx) => <li key={idx}>{rs}</li>)}
                        </ul>
                      </div>
                    ))}
                    {data.risks.filter(r => ['High', 'Critical'].includes(r.level)).length === 0 && (
                      <p className="text-gray-500 text-sm">No critical risks detected by RiskAnalyzer Agent.</p>
                    )}
                  </div>
                </div>

                {data.suggestions.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-emerald-400">Contract Redlines (Negotiation Advisor)</h3>
                    {data.suggestions.map((s, i) => (
                      <div key={i} className="p-4 bg-gray-950 rounded-xl mb-3 border border-gray-800">
                        <p className="text-sm text-gray-400 line-through mb-2">{s.original}</p>
                        <p className="text-sm text-emerald-400 font-medium mb-2">{s.proposed}</p>
                        <p className="text-xs text-gray-500">Rationale: {s.rationale}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default App;
