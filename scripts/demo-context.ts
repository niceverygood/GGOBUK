// Dumps the enriched saju context that gets fed to the LLM for Hi's reference saju.
import { buildSajuResult } from '../src/lib/saju';
import { formatSajuContext } from '../src/lib/llm/prompts/saju_context';

const saju = buildSajuResult({
  birthDate: '1985-11-14',
  birthTime: '14:05',
  isLunar: false,
  gender: 'M',
});

console.log(formatSajuContext(saju, 'Hi'));
