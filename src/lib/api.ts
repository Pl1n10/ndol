import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Category, Subscription, NewSubscription, Alternative, Stats, Settings } from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('ndol_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Errore sconosciuto' }));
    throw new Error(error.error || 'Errore nella richiesta');
  }
  
  return res.json();
}

// ============ CATEGORIES ============

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchJson<Category[]>('/categories'),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { name: string; icon?: string; color?: string }) =>
      fetchJson<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// ============ SUBSCRIPTIONS ============

export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => fetchJson<Subscription[]>('/subscriptions'),
  });
}

export function useSubscription(id: string) {
  return useQuery({
    queryKey: ['subscriptions', id],
    queryFn: () => fetchJson<Subscription>(`/subscriptions/${id}`),
    enabled: !!id,
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: NewSubscription) =>
      fetchJson<Subscription>('/subscriptions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewSubscription> }) =>
      fetchJson<Subscription>(`/subscriptions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/subscriptions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// ============ STATS ============

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => fetchJson<Stats>('/stats'),
  });
}

// ============ ALTERNATIVES ============

export function useAlternatives(subscriptionId: string) {
  return useQuery({
    queryKey: ['alternatives', subscriptionId],
    queryFn: () => fetchJson<Alternative[]>(`/subscriptions/${subscriptionId}/alternatives`),
    enabled: !!subscriptionId,
  });
}

export function useCreateAlternative() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ subscriptionId, data }: { subscriptionId: string; data: Omit<Alternative, 'id' | 'subscriptionId' | 'createdAt'> }) =>
      fetchJson<Alternative>(`/subscriptions/${subscriptionId}/alternatives`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['alternatives', variables.subscriptionId] });
    },
  });
}

export function useDeleteAlternative() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/alternatives/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alternatives'] });
    },
  });
}

// ============ SETTINGS ============

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => fetchJson<Settings>('/settings'),
  });
}

export function useSaveSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Settings) =>
      fetchJson('/settings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useTestEmail() {
  return useMutation({
    mutationFn: () =>
      fetchJson<{ success: boolean; error?: string }>('/settings/test-email', {
        method: 'POST',
      }),
  });
}
