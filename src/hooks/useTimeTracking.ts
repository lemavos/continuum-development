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

// Singleton timer state - prevents memory leaks and timer drift
class TimerManager {
  private static instance: TimerManager;
  private intervalId: NodeJS.Timeout | null = null;
  private startTime: number | null = null;
  private activeTimerId: string | null = null;
  private activeEntityId: string | null = null;
  private listeners: Set<(elapsed: number) => void> = new Set();
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
        if (data.elapsedSeconds !== undefined) {
          // Service worker is reporting elapsed time - sync our state
          const elapsed = Math.floor(data.elapsedSeconds);
          this.listeners.forEach(listener => listener(elapsed));
        }
        break;
      case 'TIMER_STOPPED':
        // Service worker stopped the timer - clean up our state
        this.stopTimer();
        break;
    }
  }

  startTimer(timerId: string, entityId: string, initialElapsed: number = 0) {
    this.stopTimer(); // Clear any existing timer

    this.activeTimerId = timerId;
    this.activeEntityId = entityId;
    this.startTime = Date.now() - (initialElapsed * 1000); // Adjust for initial elapsed time

    // Start local interval for UI updates
    this.intervalId = setInterval(() => {
      const elapsed = this.getElapsedSeconds();
      this.listeners.forEach(listener => listener(elapsed));
    }, 100); // Update every 100ms for smooth UI

    // Notify service worker
    this.sendToServiceWorker('START_TIMER', {
      timerId,
      entityId,
      startTime: this.startTime,
      initialElapsed
    });

    console.log('Timer started:', { timerId, entityId, initialElapsed });
  }

  stopTimer(): number {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const elapsed = this.getElapsedSeconds();

    // Notify service worker to stop
    this.sendToServiceWorker('STOP_TIMER', { elapsed });

    // Clear state
    this.activeTimerId = null;
    this.activeEntityId = null;
    this.startTime = null;

    console.log('Timer stopped, elapsed:', elapsed);
    return elapsed;
  }

  private sendToServiceWorker(type: string, data: any) {
    if (this.serviceWorkerController) {
      this.serviceWorkerController.postMessage({ type, data });
    }
  }

  getElapsedSeconds(): number {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  isActive(entityId?: string): boolean {
    if (entityId) {
      return this.activeEntityId === entityId;
    }
    return this.activeTimerId !== null;
  }

  getActiveTimerId(): string | null {
    return this.activeTimerId;
  }

  getActiveEntityId(): string | null {
    return this.activeEntityId;
  }

  addListener(listener: (elapsed: number) => void) {
    this.listeners.add(listener);
  }

  removeListener(listener: (elapsed: number) => void) {
    this.listeners.delete(listener);
  }

  destroy() {
    this.stopTimer();
    this.listeners.clear();
  }
}

// Global timer manager instance
const timerManager = TimerManager.getInstance();
    }
    return TimerManager.instance;
  }

  private constructor() {
    // Singleton - private constructor
  }

  startTimer(timerId: string, entityId: string, initialElapsed: number = 0) {
    this.stopTimer(); // Clear any existing timer

    this.activeTimerId = timerId;
    this.activeEntityId = entityId;
    this.startTime = Date.now() - (initialElapsed * 1000); // Adjust for initial elapsed time

    this.intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (this.startTime || 0)) / 1000);
      this.listeners.forEach(listener => listener(elapsed));
    }, 100); // Update every 100ms for smooth UI
  }

  stopTimer(): number {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const elapsed = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;

    this.activeTimerId = null;
    this.activeEntityId = null;
    this.startTime = null;

    return elapsed;
  }

  getElapsedSeconds(): number {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  isActive(entityId?: string): boolean {
    if (entityId) {
      return this.activeEntityId === entityId;
    }
    return this.activeTimerId !== null;
  }

  getActiveTimerId(): string | null {
    return this.activeTimerId;
  }

  getActiveEntityId(): string | null {
    return this.activeEntityId;
  }

  addListener(listener: (elapsed: number) => void) {
    this.listeners.add(listener);
  }

  removeListener(listener: (elapsed: number) => void) {
    this.listeners.delete(listener);
  }

  destroy() {
    this.stopTimer();
    this.listeners.clear();
  }
}

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
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Update elapsed seconds when timer manager notifies
  useEffect(() => {
    const updateElapsed = (elapsed: number) => {
      setElapsedSeconds(elapsed);
    };

    timerManager.addListener(updateElapsed);

    return () => {
      timerManager.removeListener(updateElapsed);
    };
  }, []);

  // Sync state with timer manager on mount
  useEffect(() => {
    const syncState = () => {
      setActiveTimerId(timerManager.getActiveTimerId());
      setActiveEntityId(timerManager.getActiveEntityId());
      setElapsedSeconds(timerManager.getElapsedSeconds());
    };

    syncState();
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
      timerManager.startTimer(data.id, entityId, data.elapsedSeconds || 0);

      // Update component state
      setActiveTimerId(data.id);
      setActiveEntityId(entityId);

      // Save to localStorage for recovery
      localStorage.setItem('activeTimerId', data.id);
      localStorage.setItem('activeEntityId', entityId);
      localStorage.setItem('timerStarted', new Date().toISOString());
      localStorage.setItem('timerElapsed', String(data.elapsedSeconds || 0));

      queryClient.invalidateQueries({ queryKey: ['timeTracking'] });
    },
    onError: (error) => {
      console.error('Failed to start timer:', error);
    },
  });

  // Mutation: Stop timer
  const stopTimerMutation = useMutation({
    mutationFn: (data: { sessionId: string; note?: string }) => {
      console.log('API call: stopTimer with sessionId:', data.sessionId);

      // Stop timer and get precise elapsed time
      const preciseElapsed = timerManager.stopTimer();

      // Send stop request to backend (backend calculates elapsed time)
      return timeTrackingApi.stopTimer(data.sessionId, data.note).then(r => r.data);
    },
    onSuccess: () => {
      console.log('Timer stopped successfully');

      // Update component state
      setActiveTimerId(null);
      setActiveEntityId(null);
      setElapsedSeconds(0);

      // Clear localStorage
      localStorage.removeItem('activeTimerId');
      localStorage.removeItem('activeEntityId');
      localStorage.removeItem('timerElapsed');
      localStorage.removeItem('timerStarted');

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
    const savedTimerId = localStorage.getItem('activeTimerId');
    const savedEntityId = localStorage.getItem('activeEntityId');
    const savedElapsed = localStorage.getItem('timerElapsed');
    const savedStartTime = localStorage.getItem('timerStarted');

    if (savedTimerId && savedEntityId && savedStartTime) {
      const initialElapsed = parseInt(savedElapsed || '0', 10);

      // Resume timer with TimerManager
      timerManager.startTimer(savedTimerId, savedEntityId, initialElapsed);

      // Update component state
      setActiveTimerId(savedTimerId);
      setActiveEntityId(savedEntityId);

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
    activeTimerId,
    activeEntityId,
    elapsedSeconds, // Export elapsed seconds for UI
    isStarting: startTimerMutation.isPending,
    isStopping: stopTimerMutation.isPending,
    isAdding: addTimeMutation.isPending,
    isDeleting: deleteEntryMutation.isPending,
    
    // Helpers
    formatSeconds,
  };
};
