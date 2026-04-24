import React from 'react';
import { Lightbulb, Info } from 'lucide-react';
import type { Suggestion } from '../types';

interface SuggestionsProps {
  suggestions: Suggestion[];
}

const Suggestions: React.FC<SuggestionsProps> = ({ suggestions }) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Lightbulb className="w-5 h-5 text-indigo-500" />
        <h3 className="text-lg font-semibold text-gray-100">Negotiation Suggestions</h3>
      </div>
      
      <div className="space-y-4">
        {suggestions.slice(0, 3).map((suggestion, index) => (
          <div key={index}>
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-400">Original:</span>
                  <p className="text-sm text-gray-400 line-through">
                    {suggestion.original}
                  </p>
                </div>
                
                <div>
                  <span className="text-xs text-green-500">Proposed:</span>
                  <p className="text-sm text-green-500 font-medium">
                    {suggestion.proposed}
                  </p>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Info className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-400">
                    Rationale: {suggestion.rationale}
                  </p>
                </div>
              </div>
            </div>
            
            {index < suggestions.slice(0, 3).length - 1 && (
              <div className="border-t border-gray-700 my-4" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Suggestions;
