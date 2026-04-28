import type { AnalysisRequest, AnalysisResponse } from '../types';

export const analyzeContractStream = (
  req: AnalysisRequest,
  onStageUpdate: (stage: string) => void,
  onComplete: (data: AnalysisResponse) => void,
  onError: (err: string) => void
) => {
  const url = '/api/analyze';
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
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
        incompleteChunk = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          try {
            const ev = JSON.parse(line.substring(6).trim());
            if (ev.error) {
              onError(ev.error);
              hasError = true;
              return;
            }
            if (ev.stage && ev.stage !== 'Complete') onStageUpdate(ev.stage);
            if (ev.stage === 'Complete' && ev.result) {
              onComplete(ev.result as AnalysisResponse);
              hasError = true;
            }
          } catch (e) {
            onError(`Failed to parse response: ${(e as Error).message}`);
            hasError = true;
          }
        }
      }
      if (incompleteChunk.trim().startsWith('data: ')) {
        try {
          const ev = JSON.parse(incompleteChunk.trim().substring(6).trim());
          if (ev.stage === 'Complete' && ev.result) onComplete(ev.result as AnalysisResponse);
        } catch {
          // Ignore final partial chunk parse failures.
        }
      }
    } catch (e) {
      onError(`Stream error: ${(e as Error).message}`);
    }
  }).catch((err) => onError(`Connection error: ${err.message}`));
};
