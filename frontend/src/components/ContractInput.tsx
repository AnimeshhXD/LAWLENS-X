import React from 'react';
import { FileText, TrendingUp, Loader2 } from 'lucide-react';

interface ContractInputProps {
  text: string;
  query: string;
  loading: boolean;
  onTextChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onAnalyze: () => void;
}

const ContractInput: React.FC<ContractInputProps> = ({
  text,
  query,
  loading,
  onTextChange,
  onQueryChange,
  onAnalyze,
}) => {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <FileText className="w-5 h-5 text-indigo-500" />
        <h2 className="text-lg font-semibold text-gray-100">Contract Input</h2>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-100 mb-2">
          Contract Text
        </label>
        <textarea
          className="w-full min-h-[180px] p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-colors placeholder:text-gray-400 resize-none"
          placeholder="Paste your contract text here..."
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-100 mb-2">
          Scenario Analysis (Optional)
        </label>
        <input
          type="text"
          className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-colors placeholder:text-gray-400"
          placeholder="e.g., What happens if we terminate early?"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          disabled={loading}
        />
      </div>

      <button
        onClick={onAnalyze}
        disabled={loading || !text.trim()}
        className="btn-primary w-full py-3 flex items-center justify-center space-x-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Analyzing contract...</span>
          </>
        ) : (
          <>
            <TrendingUp className="w-4 h-4" />
            <span>Analyze Contract</span>
          </>
        )}
      </button>
    </div>
  );
};

export default ContractInput;
