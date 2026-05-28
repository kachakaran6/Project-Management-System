import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api/pages/v2';

const fetcher = async (url: string, opts?: RequestInit) => {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const usePagesQueryV2 = (params: Record<string, any>, options = {}) => {
  const queryKey = ['pagesV2', params];
  return useQuery(queryKey, () => fetcher(API_BASE + '?' + new URLSearchParams(params).toString()), {
    staleTime: 10000,
    keepPreviousData: true,
    ...options,
  });
};

export const usePageQueryV2 = (id: string, options = {}) => {
  return useQuery(['pageV2', id], () => fetcher(`${API_BASE}/${id}`), { staleTime: 10000, ...options });
};

export const useCreatePageMutationV2 = () => {
  const qc = useQueryClient();
  return useMutation((data: any) => fetcher(API_BASE, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }), {
    onSuccess: () => qc.invalidateQueries(['pagesV2']),
  });
};

export const useUpdatePageMutationV2 = (id?: string) => {
  const qc = useQueryClient();
  return useMutation((data: any) => fetcher(`${API_BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }), {
    onSuccess: (_data, _vars) => {
      qc.invalidateQueries(['pagesV2']);
      qc.invalidateQueries(['pageV2', id]);
    },
  });
};

export const useDeletePageMutationV2 = () => {
  const qc = useQueryClient();
  return useMutation((id: string) => fetcher(`${API_BASE}/${id}`, { method: 'DELETE' }), {
    onSuccess: () => qc.invalidateQueries(['pagesV2']),
  });
};

export const useCreateSnapshotMutation = () => {
  const qc = useQueryClient();
  return useMutation((vars: { id: string; description?: string }) => fetcher(`${API_BASE}/${vars.id}/snapshots`, { method: 'POST', body: JSON.stringify({ description: vars.description }), headers: { 'Content-Type': 'application/json' } }), {
    onSuccess: () => qc.invalidateQueries(['pageV2']),
  });
};

export const usePageVersionsQuery = (id: string, options = {}) => {
  return useQuery(['pageV2', id, 'versions'], () => fetcher(`${API_BASE}/${id}/versions`), { staleTime: 10000, ...options });
};

export default {
  usePagesQueryV2,
  usePageQueryV2,
  useCreatePageMutationV2,
  useUpdatePageMutationV2,
  useDeletePageMutationV2,
  useCreateSnapshotMutation,
  usePageVersionsQuery,
};
