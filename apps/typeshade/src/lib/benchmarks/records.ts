import { parseRecord } from './contract.ts';
import { regressionRecordSchema } from './regression-contract.ts';
export function parseAnyRecord(value: unknown) {
  return value && typeof value === 'object' && 'schema' in value && value.schema === 2
    ? regressionRecordSchema.parse(value)
    : parseRecord(value);
}
