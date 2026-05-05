import { Play, Pause, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { Button } from '@/components/ui/button';

interface TimerWidgetProps {
  entityId: string;
  entityName: string;
  onTimerStart?: (sessionId: string) => void;
  onTimerStop?: (duration: number) => void;
  compact?: boolean;
}

interface FlipDigitProps {
  value: string;
}

function FlipDigit({ value }: FlipDigitProps) {
  const [previous, setPrevious] = useState(value);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (value !== previous) {
      setFlipping(true);
      const timeout = window.setTimeout(() => {
        setFlipping(false);
        setPrevious(value);
      }, 450);
      return () => window.clearTimeout(timeout);
    }
  }, [value, previous]);

  return (
    <div className="flip-digit relative w-[4.5rem] sm:w-[5.5rem] h-[5.5rem] sm:h-[6.5rem] perspective">
      <div className="absolute inset-0 rounded-2xl bg-zinc-950 border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="flip-face flip-top bg-zinc-950 text-white font-mono font-black text-4xl sm:text-5xl leading-tight">
          <span>{flipping ? previous : value}</span>
        </div>
        <div className="flip-face flip-bottom bg-zinc-950 text-white font-mono font-black text-4xl sm:text-5xl leading-tight">
          <span>{value}</span>
        </div>
        <div className={`flip-animation ${flipping ? 'animate-flip' : ''}`}>
          <div className="flip-panel flip-panel-top">{previous}</div>
          <div className="flip-panel flip-panel-bottom">{value}</div>
        </div>
      </div>
    </div>
  );
}

function FlipClockOverlay({ timeString, onClose }: { timeString: string; onClose: () => void }) {
  const digits = useMemo(() => timeString.replace(/:/g, '').split(''), [timeString]);

  return (
    <div className="flip-clock-fullscreen fixed inset-0 z-50 flex items-center justify-center bg-black text-white px-4 py-6">
      <div className="relative w-full max-w-[1300px]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-50 rounded-full border border-white/15 bg-black/70 p-3 text-white transition hover:bg-white/10"
          aria-label="Close flip clock"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center gap-8 rounded-3xl border border-white/10 bg-black/95 p-6 shadow-[0_0_120px_rgba(0,0,0,0.6)]">
          <div className="min-h-[220px] w-full overflow-hidden rounded-3xl bg-black px-4 py-6 sm:px-6 sm:py-8">
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {digits.map((digit, index) => (
                <FlipDigit key={`${digit}-${index}`} value={digit} />
              ))}
            </div>
          </div>
          <div className="text-center text-sm text-zinc-400">
            Pressione <span className="font-semibold text-white">Esc</span> ou clique em fechar para sair do modo Flip Clock.
          </div>
        </div>
      </div>
      <style>{`
        .perspective { perspective: 900px; }
        .flip-face { position: absolute; left: 0; right: 0; width: 100%; display: flex; align-items: center; justify-content: center; height: 50%; overflow: hidden; }
        .flip-top { top: 0; border-bottom: 1px solid rgba(255,255,255,0.12); transform-origin: bottom; }
        .flip-bottom { bottom: 0; border-top: 1px solid rgba(255,255,255,0.12); transform-origin: top; }
        .flip-animation { position: absolute; inset: 0; pointer-events: none; }
        .flip-panel { position: absolute; left: 0; right: 0; width: 100%; display: flex; align-items: center; justify-content: center; height: 50%; overflow: hidden; backface-visibility: hidden; }
        .flip-panel-top { top: 0; transform-origin: bottom; transform: rotateX(0deg); }
        .flip-panel-bottom { bottom: 0; transform-origin: top; transform: rotateX(90deg); }
        .animate-flip .flip-panel-top { animation: flip-top 0.45s ease-in forwards; }
        .animate-flip .flip-panel-bottom { animation: flip-bottom 0.45s ease-out 0.2s forwards; }

        @keyframes flip-top {
          0% { transform: rotateX(0deg); }
          100% { transform: rotateX(-90deg); }
        }
        @keyframes flip-bottom {
          0% { transform: rotateX(90deg); }
          100% { transform: rotateX(0deg); }
        }
      `}</style>
    </div>
  );
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
  const [isFlipOpen, setIsFlipOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenRef = useRef<HTMLDivElement | null>(null);

  const { data: activeTimer, isLoading: timerLoading } = getActiveTimer(entityId);
  const isRunning = isTimerActive(entityId);

  // Get the current timer value from the hook's shared state
  const currentElapsed = isRunning ? getElapsedSeconds(entityId) : (activeTimer?.elapsedSeconds || 0);
  const timeString = formatSeconds(currentElapsed);

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

  const openFlipClock = async () => {
    setIsFlipOpen(true);
    if (fullscreenRef.current?.requestFullscreen) {
      try {
        await fullscreenRef.current.requestFullscreen();
      } catch (error) {
        console.warn('Fullscreen request failed:', error);
      }
    }
  };

  const closeFlipClock = async () => {
    setIsFlipOpen(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        console.warn('Exit fullscreen failed:', error);
      }
    }
  };

  useEffect(() => {
    const onFullScreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        setIsFlipOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFlipOpen) {
        closeFlipClock();
      }
    };

    document.addEventListener('fullscreenchange', onFullScreenChange);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('fullscreenchange', onFullScreenChange);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isFlipOpen]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-zinc-400">
          {timeString}
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
    <div className="relative flex flex-col items-center gap-4 p-4 bg-zinc-900/50 rounded-lg border border-white/5">
      <h3 className="text-lg font-medium text-white">{entityName}</h3>
      
      <div className="text-4xl font-mono font-bold text-cyan-400">
        {timeString}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
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

        <Button
          onClick={openFlipClock}
          variant="secondary"
          className="gap-2"
        >
          Go to Flip Clock
        </Button>
      </div>

      {timerLoading && (
        <p className="text-xs text-zinc-500">Loading timer status...</p>
      )}

      {isFlipOpen && (
        <div ref={fullscreenRef} className="fixed inset-0 z-50 bg-black/95 p-4 sm:p-8">
          <FlipClockOverlay timeString={timeString} onClose={closeFlipClock} />
        </div>
      )}
    </div>
  );
}
