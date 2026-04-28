import React, { useRef } from 'react';
import { FileText, TrendingUp, Loader2, Upload } from 'lucide-react';
import { extractTextFromFile } from '../utils/fileExtractor';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState<string>('');
  const [fileError, setFileError] = React.useState<string>('');
  const [extracting, setExtracting] = React.useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError('');
    setExtracting(true);
    
    try {
      const extractedText = await extractTextFromFile(file);
      onTextChange(extractedText);
      setFileName(file.name);
    } catch (error) {
      setFileError((error as Error).message);
      setFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <FileText className="w-5 h-5 text-indigo-500" />
        <h2 className="text-lg font-semibold text-gray-100">Contract Input</h2>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-100 mb-2">
          Upload PDF/TXT
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || extracting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
          >
            {extracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Choose File
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileSelect}
            className="hidden"
            disabled={loading || extracting}
          />
          {fileName && (
            <span className="text-sm text-gray-400 truncate max-w-xs">
              ✓ {fileName}
            </span>
          )}
        </div>
        {fileError && (
          <p className="mt-2 text-sm text-red-400">{fileError}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-100 mb-2">
          Contract Text
        </label>
        <textarea
          className="w-full min-h-[180px] p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-colors placeholder:text-gray-400 resize-none"
          placeholder="Paste your contract text here or upload a PDF/TXT file..."
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-100 mb-2">
          Ask a Question (Optional)
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
        disabled={loading || !text.trim() || extracting}
        className="btn-primary w-full py-3 flex items-center justify-center space-x-2"
        type="button"
        tabIndex={0}
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
