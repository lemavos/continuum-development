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

// Singleton timer state - supports multiple concurrent timers
class TimerManager {
  private static instance: TimerManager;
  private timers: Map<string, {
    intervalId: NodeJS.Timeout | null;
    startTime: number | null;
    entityId: string;
    listeners: Set<(entityId: string, elapsed: number) => void>;
  }> = new Map();
  private serviceWorkerController: ServiceWorker | null = null;

  static getInstance(): TimerManager {
    if (!TimerManager.instance) {
      TimerManager.instance = new TimerManager();
    }
    return TimerManager.instance;
  }

  private constructor() {
    // Initialize Service Worker communication
    this.initializeServiceWorker();
  }

  private async initializeServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    try {
      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.register('/timer-service-worker.js');
      this.serviceWorkerController = registration.active;

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event);
      });

      console.log('Service Worker initialized for timer management');
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
    }
  }

  private handleServiceWorkerMessage(event: MessageEvent) {
    const { type, data } = event.data;

    switch (type) {
      case 'TIMER_UPDATE':
        if (data.entityId && data.elapsedSeconds !== undefined) {
          // Service worker is reporting elapsed time for this entity
          const timer = this.timers.get(data.entityId);
          if (timer) {
            const elapsed = Math.floor(data.elapsedSeconds);
            timer.listeners.forEach(listener => listener(data.entityId, elapsed));
          }
        }
        break;
      case 'TIMER_STOPPED':
        // Service worker stopped the timer - clean up state for this entity
        if (data.entityId) {
          this.stopTimer(data.entityId);
        }
        break;
    }
  }

  startTimer(timerId: string, entityId: string, initialElapsed: number = 0) {
    // Stop existing timer for this entity if any
    this.stopTimer(entityId);

    const startTime = Date.now() - (initialElapsed * 1000);
    const listeners = new Set<(entityId: string, elapsed: number) => void>();

    // Start local interval for UI updates
    const intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      listeners.forEach(listener => listener(entityId, elapsed));
    }, 100);

    this.timers.set(entityId, { intervalId, startTime, entityId, listeners });

    // Notify service worker
    this.sendToServiceWorker('START_TIMER', {
      timerId,
      entityId,
      startTime,
      initialElapsed
    });

    console.log('Timer started:', { timerId, entityId, initialElapsed });
  }

  stopTimer(entityId: string): number {
    const timer = this.timers.get(entityId);
    if (!timer) return 0;

    if (timer.intervalId) {
      clearInterval(timer.intervalId);
    }

    const elapsed = Math.floor((Date.now() - (timer.startTime || 0)) / 1000);

    // Notify service worker to stop
    this.sendToServiceWorker('STOP_TIMER', { entityId, elapsed });

    // Clear state
    this.timers.delete(entityId);

    console.log('Timer stopped for entity:', entityId, 'elapsed:', elapsed);
    return elapsed;
  }

  private sendToServiceWorker(type: string, data: any) {
    if (this.serviceWorkerController) {
      this.serviceWorkerController.postMessage({ type, data });
    }
  }

  getElapsedSeconds(entityId: string): number {
    const timer = this.timers.get(entityId);
    if (!timer || !timer.startTime) return 0;
    return Math.floor((Date.now() - timer.startTime) / 1000);
  }

  isActive(entityId: string): boolean {
    return this.timers.has(entityId);
  }

  getActiveTimerId(entityId: string): string | null {
    // This method now needs entityId to know which timer
    // For backward compatibility, return the first active timer ID
    for (const [eid, timer] of this.timers) {
      if (eid === entityId) return eid; // Return entityId as timerId for now
    }
    return null;
  }

  getActiveEntityId(): string | null {
    // Return the first active entity
    const entities = Array.from(this.timers.keys());
    return entities.length > 0 ? entities[0] : null;
  }

  addListener(entityId: string, listener: (entityId: string, elapsed: number) => void) {
    const timer = this.timers.get(entityId);
    if (timer) {
      timer.listeners.add(listener);
    }
  }

  removeListener(entityId: string, listener: (entityId: string, elapsed: number) => void) {
    const timer = this.timers.get(entityId);
    if (timer) {
      timer.listeners.delete(listener);
    }
  }

  getActiveTimers(): Map<string, { intervalId: NodeJS.Timeout | null; startTime: number | null; entityId: string; listeners: Set<(entityId: string, elapsed: number) => void> }> {
    return this.timers;
  }

  destroy() {
    for (const [entityId, timer] of this.timers) {
      if (timer.intervalId) {
        clearInterval(timer.intervalId);
      }
    }
    this.timers.clear();
  }
}

// Global timer manager instance
const timerManager = TimerManager.getInstance();

// Global flag to prevent multiple recovery attempts
let timerRecovered = false;

// Service Worker message handler - singleton
let serviceWorkerInitialized = false;

const initializeServiceWorkerListener = () => {
  if (serviceWorkerInitialized || typeof window === 'undefined') return;
  serviceWorkerInitialized = true;

  // Service Worker is now handled by TimerManager singleton
};

initializeServiceWorkerListener();

/**
 * Hook for managing time tracking operations
 */
export const useTimeTracking = () => {
  const queryClient = useQueryClient();
  const [activeTimers, setActiveTimers] = useState<Map<string, { timerId: string; elapsedSeconds: number }>>(new Map());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Update elapsed seconds when timer manager notifies
  useEffect(() => {
    const updateElapsed = (entityId: string, elapsed: number) => {
      setActiveTimers(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(entityId);
        if (existing) {
          newMap.set(entityId, { ...existing, elapsedSeconds: elapsed });
        }
        return newMap;
      });
      setElapsedSeconds(elapsed);
    };

    // Add listeners for all current timers
    for (const entityId of timerManager.getActiveTimers().keys()) {
      timerManager.addListener(entityId, updateElapsed);
    }

    return () => {
      for (const entityId of timerManager.getActiveTimers().keys()) {
        timerManager.removeListener(entityId, updateElapsed);
      }
    };
  }, []);

  // Sync state with timer manager on mount and when it changes
  useEffect(() => {
    const syncState = () => {
      // Don't reset activeTimers on sync - preserve the timerId from startMutation
      // Only refresh elapsed seconds
      setActiveTimers(prev => {
        const newMap = new Map(prev);
        for (const [entityId, timerData] of newMap) {
          newMap.set(entityId, {
            ...timerData,
            elapsedSeconds: timerManager.getElapsedSeconds(entityId)
          });
        }
        return newMap;
      });
    };

    // Initial sync
    syncState();

    // Set up periodic sync to update elapsed seconds
    const intervalId = setInterval(syncState, 200);

    return () => clearInterval(intervalId);
  }, []);

  // Query: Get total time for an entity
  const getTotalTime = (entityId: string) => {
    return useQuery({
      queryKey: ['timeTracking', 'total', entityId],
      queryFn: () => timeTrackingApi.getTotalTime(entityId).then(r => r.data),
      refetchInterval: false, // Disabled to avoid re-renders
      staleTime: 10000, // Cache for 10 seconds
    });
  };

  // Query: Get daily breakdown
  const getDailyBreakdown = (entityId: string) => {
    return useQuery({
      queryKey: ['timeTracking', 'daily', entityId],
      queryFn: () => timeTrackingApi.getDailyBreakdown(entityId).then(r => r.data),
      staleTime: 30000, // Cache for 30 seconds
    });
  };

  // Query: Get all summaries
  const getAllSummaries = () => {
    return useQuery({
      queryKey: ['timeTracking', 'summaries'],
      queryFn: () => timeTrackingApi.getAllSummaries().then(r => r.data),
      refetchInterval: false, // Manual refetch only
      staleTime: 5000, // Cache for 5 seconds
    });
  };

  // Query: Get active timer
  const getActiveTimer = (entityId: string) => {
    return useQuery({
      queryKey: ['timeTracking', 'activeTimer', entityId],
      queryFn: () => timeTrackingApi.getActiveTimer(entityId).then(r => r.data),
      refetchInterval: false, // Use local timer instead
      staleTime: 2000, // Cache for 2 seconds
    });
  };

  // Mutation: Start timer
  const startTimerMutation = useMutation({
    mutationFn: (entityId: string) => {
      console.log('API call: startTimer for entityId:', entityId);
      return timeTrackingApi.startTimer(entityId).then(r => r.data);
    },
    onSuccess: (data: TimerSession, entityId: string) => {
      console.log('Timer started successfully:', data);

      // Start timer manager with precise delta calculation
      const initialElapsed = (data.elapsedSeconds || 0) / 1000; // Convert ms to seconds if needed
      timerManager.startTimer(data.id, entityId, initialElapsed);

      // Update component state immediately with server's elapsed time
      setActiveTimers(prev => {
        const newMap = new Map(prev);
        newMap.set(entityId, { timerId: data.id, elapsedSeconds: initialElapsed });
        return newMap;
      });

      // Save to localStorage for recovery
      localStorage.setItem('activeTimerId', data.id);
      localStorage.setItem('activeEntityId', entityId);
      localStorage.setItem('timerStartTime', Date.now().toString());
      localStorage.setItem('timerInitialElapsed', String(initialElapsed));

      queryClient.invalidateQueries({ queryKey: ['timeTracking'] });
    },
    onError: (error) => {
      console.error('Failed to start timer:', error);
    },
  });

  // Mutation: Stop timer
  const stopTimerMutation = useMutation({
    mutationFn: (data: { sessionId: string; note?: string }) => {
      console.log('API call: stopTimer with sessionId:', data.sessionId, 'note:', data.note || '');

      // Find the entityId for this sessionId
      const entityId = Array.from(activeTimers.entries()).find(([_, timer]) => timer.timerId === data.sessionId)?.[0];
      if (!entityId) throw new Error('Timer not found');

      // Stop timer and get precise elapsed time
      const preciseElapsed = timerManager.stopTimer(entityId);

      // Send stop request to backend with note (default to empty string if not provided)
      return timeTrackingApi.stopTimer(data.sessionId, data.note || '').then(r => r.data);
    },
    onSuccess: (data, variables) => {
      console.log('Timer stopped successfully');

      // Find and remove from active timers
      const entityId = Array.from(activeTimers.entries()).find(([_, timer]) => timer.timerId === variables.sessionId)?.[0];
      if (entityId) {
        setActiveTimers(prev => {
          const newMap = new Map(prev);
          newMap.delete(entityId);
          return newMap;
        });
      }

      // Clear localStorage if this was the last timer
      if (activeTimers.size <= 1) {
        localStorage.removeItem('activeTimerId');
        localStorage.removeItem('activeEntityId');
        localStorage.removeItem('timerStartTime');
        localStorage.removeItem('timerInitialElapsed');
      }

      queryClient.invalidateQueries({ queryKey: ['timeTracking'] });
    },
    onError: (error) => {
      console.error('Failed to stop timer:', error);
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

  // Initialize: Check for interrupted timers on mount and recovery
  useEffect(() => {
    if (timerRecovered) return; // Already recovered by another instance

    const savedTimerId = localStorage.getItem('activeTimerId');
    const savedEntityId = localStorage.getItem('activeEntityId');
    const savedElapsed = localStorage.getItem('timerElapsed');
    const savedStartTime = localStorage.getItem('timerStarted');

    if (savedTimerId && savedEntityId && savedStartTime) {
      const initialElapsed = parseInt(savedElapsed || '0', 10);

      // Resume timer with TimerManager
      timerManager.startTimer(savedTimerId, savedEntityId, initialElapsed);

      // Update component state
      setActiveTimers(prev => {
        const newMap = new Map(prev);
        newMap.set(savedEntityId, { timerId: savedTimerId, elapsedSeconds: initialElapsed });
        return newMap;
      });

      timerRecovered = true; // Mark as recovered
      console.log('Timer recovered from localStorage:', { savedTimerId, savedEntityId, initialElapsed });
    }
  }, []);

  // Cleanup on unmount - only cleanup listeners, keep timer running
  useEffect(() => {
    return () => {
      // Timer continues running even when component unmounts
      // It will be stopped explicitly by user action
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
    activeTimers,
    isTimerActive: (entityId: string) => activeTimers.has(entityId),
    getElapsedSeconds: (entityId: string) => activeTimers.get(entityId)?.elapsedSeconds || 0,
    isStarting: startTimerMutation.isPending,
    isStopping: stopTimerMutation.isPending,
    isAdding: addTimeMutation.isPending,
    isDeleting: deleteEntryMutation.isPending,
    
    // Helpers
    formatSeconds,
  };
};
