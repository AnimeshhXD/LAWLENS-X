import React, { useState } from 'react';
import type { AnalysisResponse } from './types';
import { analyzeContractStream } from './api/client';
import Navbar from './components/Navbar';
import ContractInput from './components/ContractInput';
import ResultsDashboard from './components/ResultsDashboard';
import { XCircle } from 'lucide-react';

const App: React.FC = () => {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');

  const handleAnalyze = () => {
    if (!text.trim()) return;
    
    setLoading(true);
    setError('');
    setData(null);
    setStage('Initializing AI Agents...');
    
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
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contract Input Section */}
          <div className="space-y-4">
            <ContractInput
              text={text}
              query={query}
              loading={loading}
              onTextChange={setText}
              onQueryChange={setQuery}
              onAnalyze={handleAnalyze}
            />
            
            {error && (
              <div className="card p-4 border-red-800/20 bg-red-900/10">
                <div className="flex items-center space-x-2 text-red-400">
                  <XCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}
          </div>

          {/* Results Dashboard */}
          <div>
            <ResultsDashboard
              data={data}
              loading={loading}
              stage={stage}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
