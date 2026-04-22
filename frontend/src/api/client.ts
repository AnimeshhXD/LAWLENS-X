import { AnalysisRequest, AnalysisResponse } from '../types';

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
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let incompleteChunk = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = (incompleteChunk + chunk).split('\n\n');
      incompleteChunk = lines.pop() || ''; // Keep the incomplete part

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const dataStr = line.substring(6);
            const ev = JSON.parse(dataStr);
            if (ev.error) {
              onError(ev.error);
              return;
            }
            if (ev.stage && ev.stage !== 'Complete') {
              onStageUpdate(ev.stage);
            }
            if (ev.stage === 'Complete' && ev.result) {
              onComplete(ev.result as AnalysisResponse);
            }
          } catch (e) {
            console.error("SSE parse error", e);
          }
        }
      }
    }
  }).catch(err => {
    onError(err.message);
  });
};
