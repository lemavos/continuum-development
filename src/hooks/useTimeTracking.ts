import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeTrackingApi } from '@/lib/api';

export interface TimeEntry {
  id: string;
  entityId: string;
  date: string;
  durationSeconds: number;
  formattedDuration: string;
  note?: string;
  source: 'TIMER' | 'MANUAL' | 'RECOVERED';
  createdAt: string;
  updatedAt: string;
}

export interface TimerSession {
  id: string;
  entityId: string;
  startedAt: string;
  stoppedAt?: string;
  status: 'RUNNING' | 'COMPLETED' | 'ABANDONED';
  elapsedSeconds: number;
  formattedElapsed: string;
  createdAt: string;
}

export interface TimeEntitySummary {
  entityId: string;
  entityTitle?: string;
  totalSeconds: number;
  formattedTotal: string;
  totalHours: number;
  entriesCount: number;
  activeSessionDuration?: number;
  hasActiveTimer: boolean;
}

/** 
 * Hook for managing time tracking operations
 */
export const useTimeTracking = () => {
  const queryClient = useQueryClient();
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const elapsedRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Query: Get total time for an entity
  const getTotalTime = (entityId: string) => {
    return useQuery({
      queryKey: ['timeTracking', 'total', entityId],
      queryFn: () => timeTrackingApi.getTotalTime(entityId).then(r => r.data),
      refetchInterval: activeTimerId === entityId ? 1000 : false,
    });
  };

  // Query: Get daily breakdown
  const getDailyBreakdown = (entityId: string) => {
    return useQuery({
      queryKey: ['timeTracking', 'daily', entityId],
      queryFn: () => timeTrackingApi.getDailyBreakdown(entityId).then(r => r.data),
    });
  };

  // Query: Get all summaries
  const getAllSummaries = () => {
    return useQuery({
      queryKey: ['timeTracking', 'summaries'],
      queryFn: () => timeTrackingApi.getAllSummaries().then(r => r.data),
      refetchInterval: 5000, // Update every 5 seconds for active timers
    });
  };

  // Query: Get active timer
  const getActiveTimer = (entityId: string) => {
    return useQuery({
      queryKey: ['timeTracking', 'activeTimer', entityId],
      queryFn: () => timeTrackingApi.getActiveTimer(entityId).then(r => r.data),
      refetchInterval: activeTimerId === entityId ? 1000 : 5000,
    });
  };

  // Mutation: Start timer
  const startTimerMutation = useMutation({
    mutationFn: (entityId: string) =>
      timeTrackingApi.startTimer(entityId).then(r => r.data),
    onSuccess: (data: TimerSession, entityId: string) => {
      setActiveTimerId(data.id);
      setActiveEntityId(entityId);
      queryClient.invalidateQueries({ queryKey: ['timeTracking'] });
      
      // Save to localStorage for recovery
      localStorage.setItem('activeTimerId', data.id);
      localStorage.setItem('activeEntityId', entityId);
      localStorage.setItem('timerStarted', new Date().toISOString());
    },
  });

  // Mutation: Stop timer
  const stopTimerMutation = useMutation({
    mutationFn: (data: { sessionId: string; note?: string }) =>
      timeTrackingApi.stopTimer(data.sessionId, data.note).then(r => r.data),
    onSuccess: () => {
      setActiveTimerId(null);
      setActiveEntityId(null);
      localStorage.removeItem('activeTimerId');
      localStorage.removeItem('activeEntityId');
      queryClient.invalidateQueries({ queryKey: ['timeTracking'] });
    },
  });

  // Mutation: Add time manually
  const addTimeMutation = useMutation({
    mutationFn: (data: { entityId: string; date: string; durationSeconds: number; note?: string }) =>
      timeTrackingApi.addTime(data.entityId, data.date, data.durationSeconds, data.note).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeTracking'] });
    },
  });

  // Mutation: Delete entry
  const deleteEntryMutation = useMutation({
    mutationFn: (entryId: string) =>
      timeTrackingApi.deleteEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeTracking'] });
    },
  });

  // Recovery: Check for interrupted timers on mount
  useEffect(() => {
    const savedTimerId = localStorage.getItem('activeTimerId');
    const savedEntityId = localStorage.getItem('activeEntityId');
    if (savedTimerId && savedEntityId) {
      setActiveTimerId(savedTimerId);
      setActiveEntityId(savedEntityId);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Format seconds to HH:MM:SS
  const formatSeconds = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  return {
    // Queries
    getTotalTime,
    getDailyBreakdown,
    getAllSummaries,
    getActiveTimer,
    
    // Mutations
    startTimer: startTimerMutation.mutate,
    startTimerAsync: startTimerMutation.mutateAsync,
    stopTimer: stopTimerMutation.mutate,
    stopTimerAsync: stopTimerMutation.mutateAsync,
    addTime: addTimeMutation.mutate,
    addTimeAsync: addTimeMutation.mutateAsync,
    deleteEntry: deleteEntryMutation.mutate,
    
    // Status
    activeTimerId,
    activeEntityId,
    isStarting: startTimerMutation.isPending,
    isStopping: stopTimerMutation.isPending,
    isAdding: addTimeMutation.isPending,
    isDeleting: deleteEntryMutation.isPending,
    
    // Helpers
    formatSeconds,
  };
};
