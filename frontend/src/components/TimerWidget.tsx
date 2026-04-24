import { Play, Pause, Trash2 } from 'lucide-react';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { Button } from '@/components/ui/button';

interface TimerWidgetProps {
  entityId: string;
  entityName: string;
  onTimerStart?: (sessionId: string) => void;
  onTimerStop?: (duration: number) => void;
  compact?: boolean;
}

/**
 * Reusable timer widget component - uses shared timer state
 */
export function TimerWidget({
  entityId,
  entityName,
  onTimerStart,
  onTimerStop,
  compact = false,
}: TimerWidgetProps) {
  const { activeTimers, isTimerActive, getElapsedSeconds, startTimer, stopTimer, isStarting, isStopping, getActiveTimer, formatSeconds } = useTimeTracking();
  
  const { data: activeTimer, isLoading: timerLoading } = getActiveTimer(entityId);
  const isRunning = isTimerActive(entityId);

  // Get the current timer value from the hook's shared state
  const currentElapsed = isRunning ? getElapsedSeconds(entityId) : (activeTimer?.elapsedSeconds || 0);

  const handleStart = async () => {
    try {
      await startTimer(entityId);
      onTimerStart?.(entityId);
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const handleStop = async () => {
    try {
      const activeTimerData = activeTimers.get(entityId);
      if (activeTimerData) {
        await stopTimer({ sessionId: activeTimerData.timerId });
        onTimerStop?.(currentElapsed);
      }
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-zinc-400">
          {formatSeconds(currentElapsed)}
        </span>
        {isRunning ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleStop}
            disabled={isStopping}
            className="h-6 w-6 p-0"
            title="Stop timer"
          >
            <Pause className="w-3 h-3" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handleStart}
            disabled={isStarting}
            className="h-6 w-6 p-0"
            title="Start timer"
          >
            <Play className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-zinc-900/50 rounded-lg border border-white/5">
      <h3 className="text-lg font-medium text-white">{entityName}</h3>
      
      <div className="text-4xl font-mono font-bold text-cyan-400">
        {formatSeconds(currentElapsed)}
      </div>

      <div className="flex gap-2">
        {isRunning ? (
          <Button
            onClick={handleStop}
            disabled={isStopping || timerLoading}
            variant="destructive"
            className="gap-2"
          >
            <Pause className="w-4 h-4" />
            Stop & Save
          </Button>
        ) : (
          <Button
            onClick={handleStart}
            disabled={isStarting || timerLoading}
            variant="default"
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            Start Timer
          </Button>
        )}
      </div>

      {timerLoading && (
        <p className="text-xs text-zinc-500">Loading timer status...</p>
      )}
    </div>
  );
}
