import { useQuery } from '@tanstack/react-query';
import { fetchFinancialSummary } from './finances.api';

export function useFinancialSummary(year: number, month: number) {
  return useQuery({
    queryKey: ['finances', 'summary', year, month],
    queryFn: () => fetchFinancialSummary(year, month),
    staleTime: 60_000,
  });
}
