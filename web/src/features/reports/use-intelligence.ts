import type { DailyBriefing, RestockRecommendation } from '@shopsense/shared';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { unwrap } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export function useRestockRecommendations() {
  return useQuery({
    queryKey: queryKeys.intelligence.restockRecommendations(),
    queryFn: () => unwrap(apiClient.get<RestockRecommendation[]>('/intelligence/restock-recommendations')),
  });
}

export function useDailyBriefing(date: string) {
  return useQuery({
    queryKey: queryKeys.intelligence.dailyBriefing(date),
    queryFn: () => unwrap(apiClient.get<DailyBriefing>(`/intelligence/daily-briefing?date=${date}`)),
  });
}
