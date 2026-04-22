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
        <Lightbulb className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-semibold text-text-primary">Negotiation Suggestions</h3>
      </div>
      
      <div className="space-y-4">
        {suggestions.slice(0, 3).map((suggestion, index) => (
          <div key={index}>
            <div className="p-4 bg-card-hover rounded-lg border border-border">
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-text-secondary">Original:</span>
                  <p className="text-sm text-text-secondary line-through">
                    {suggestion.original}
                  </p>
                </div>
                
                <div>
                  <span className="text-xs text-success">Proposed:</span>
                  <p className="text-sm text-success font-medium">
                    {suggestion.proposed}
                  </p>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Info className="w-3 h-3 text-text-secondary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-text-secondary">
                    Rationale: {suggestion.rationale}
                  </p>
                </div>
              </div>
            </div>
            
            {index < suggestions.slice(0, 3).length - 1 && (
              <div className="border-t border-border my-4" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Suggestions;
