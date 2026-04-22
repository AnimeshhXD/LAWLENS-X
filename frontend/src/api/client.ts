import type { AnalysisRequest, AnalysisResponse } from '../types';

export const analyzeContractStream = (
  req: AnalysisRequest, 
  onStageUpdate: (stage: string) => void,
  onComplete: (data: AnalysisResponse) => void,
  onError: (err: string) => void
) => {
  const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/analyze/stream`;

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  }).then(async (response) => {
    if (!response.ok) {
      onError(`HTTP ${response.status}: ${response.statusText}`);
      return;
    }
    
    if (!response.body) {
      onError('Response body is empty');
      return;
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let incompleteChunk = '';
    let hasError = false;

    try {
      while (!hasError) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const fullText = incompleteChunk + chunk;
        const lines = fullText.split('\n\n');
        
        // Keep the last incomplete part for next iteration
        incompleteChunk = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;  // Skip empty lines
          
          if (line.startsWith('data: ')) {
            try {
              const dataStr = line.substring(6).trim();
              if (!dataStr) continue;
              
              const ev = JSON.parse(dataStr);
              
              if (ev.error) {
                onError(ev.error);
                hasError = true;
                return;
              }
              
              if (ev.stage && ev.stage !== 'Complete') {
                onStageUpdate(ev.stage);
              }
              
              if (ev.stage === 'Complete' && ev.result) {
                onComplete(ev.result as AnalysisResponse);
                hasError = true;  // Exit loop after completion
              }
            } catch (e) {
              console.error("SSE JSON parse error:", e, "Line:", line);
              onError(`Failed to parse response: ${(e as Error).message}`);
              hasError = true;
            }
          }
        }
      }
    } catch (e) {
      console.error("Stream reading error:", e);
      onError(`Stream error: ${(e as Error).message}`);
    }
  }).catch((err) => {
    console.error("Fetch error:", err);
    onError(`Connection error: ${err.message}`);
  });
};

