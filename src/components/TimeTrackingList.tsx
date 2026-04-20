import { useState } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { entitiesApi } from '@/lib/api';
import { useTimeTracking, type TimeEntitySummary } from '@/hooks/useTimeTracking';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Pause, MoreVertical, FolderOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Entity } from '@/types';

/**
 * List of all trackable entities with time summaries
 */
export function TimeTrackingList() {
  const navigate = useNavigate();
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const { getAllSummaries, startTimer, stopTimer, formatSeconds, activeTimers, isTimerActive, getElapsedSeconds, isStarting, isStopping } = useTimeTracking();

  const { data: trackableEntities, isLoading: entitiesLoading } = useQuery({
    queryKey: ['entities', 'trackable'],
    queryFn: async () => {
      const response = await entitiesApi.list();
      return (response.data as Entity[]).filter(e => e.type === 'PROJECT' || e.type === 'HABIT');
    },
  });

  const { data: summaries, isLoading: summariesLoading } = getAllSummaries();

  const getSummaryForEntity = (entityId: string): TimeEntitySummary | undefined => {
    if (!summaries) return undefined;
    return summaries.find((s: TimeEntitySummary) => s.entityId === entityId);
  };

  const handleStartTimer = (entityId: string) => {
    startTimer(entityId);
    setSelectedEntity(entityId);
  };

  const handleStopTimer = (entityId: string) => {
    const activeTimerData = activeTimers.get(entityId);
    if (activeTimerData) {
      stopTimer({ sessionId: activeTimerData.timerId });
      setSelectedEntity(null);
    }
  };

  const isLoading = entitiesLoading || summariesLoading;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-semibold text-white">
            Time Tracking
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Track time spent on your projects and habits
          </p>
        </div>
        <Button onClick={() => navigate('/entities/new')} className="gap-2">
          <FolderOpen className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : !trackableEntities || trackableEntities.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
          <p className="text-sm text-zinc-500 mb-4">
            Create a project to start tracking time
          </p>
          <Button onClick={() => navigate('/entities/new')}>
            Create Project
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trackableEntities.map(entity => {
            const summary = getSummaryForEntity(entity.id);
            const isEntityTimerActive = isTimerActive(entity.id);

            return (
              <Card
                key={entity.id}
                className={`p-4 cursor-pointer transition-all ${
                  isEntityTimerActive
                    ? 'ring-2 ring-cyan-500 bg-cyan-950/20'
                    : 'hover:border-white/20'
                }`}
                onClick={() => navigate(`/time-tracking/${entity.id}`)}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-white truncate">
                        {entity.title}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {entity.type === 'PROJECT' ? '📁 Project' : '🔥 Habit'}
                      </p>
                    </div>
                    <button className="text-zinc-400 hover:text-white p-1" onClick={(e) => e.stopPropagation()}>
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="bg-zinc-950/50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Total Time</span>
                      <span className="font-mono font-bold text-cyan-400">
                        {summary?.formattedTotal || '00:00:00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400">
                        {summary?.entriesCount || 0} entries
                      </span>
                      <span className="text-zinc-400">
                        {summary?.totalHours?.toFixed(1) || '0.0'}h
                      </span>
                    </div>
                  </div>

                  {/* Timer Controls */}
                  <div className="flex gap-2">
                    {isEntityTimerActive ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStopTimer(entity.id);
                        }}
                        disabled={isStopping}
                      >
                        <Pause className="w-4 h-4" />
                        Stop
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartTimer(entity.id);
                        }}
                        disabled={isStarting}
                      >
                        <Play className="w-4 h-4" />
                        Start
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/time-tracking/${entity.id}`);
                      }}
                      className="text-xs"
                    >
                      Details
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
