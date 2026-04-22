import { useState } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { entitiesApi } from '@/lib/api';
import { useTimeTracking, type TimeEntitySummary } from '@/hooks/useTimeTracking';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Pause, MoreVertical, FolderOpen, Briefcase, Flame } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Entity } from '@/types';

/**
 * List of all trackable entities with time summaries
 */
export function TimeTrackingList() {
  const navigate = useNavigate();
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const { getAllSummaries, startTimer, stopTimer, formatSeconds, activeTimers, isTimerActive, getElapsedSeconds, isStarting, isStopping } = useTimeTracking();

  const { data: trackableEntities, isLoading: entitiesLoading } = useQuery({
    queryKey: ['entities', 'trackable'],
    queryFn: async () => {
      const response = await entitiesApi.list();
      // Return Projects and Habits
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
      // Pass the sessionId (timerId) correctly with empty note as default
      stopTimer({ sessionId: activeTimerData.timerId, note: '' });
      setSelectedEntity(null);
    }
  };

  const isLoading = entitiesLoading || summariesLoading;

  const filteredEntities = trackableEntities?.filter(e => selectedType ? e.type === selectedType : true) || [];

  const types = ['PROJECT', 'HABIT'];
  const typeIcons: Record<string, any> = { PROJECT: Briefcase, HABIT: Flame };
  const typeLabels: Record<string, string> = { PROJECT: 'Project', HABIT: 'Habit' };

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

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="lg:w-44 lg:shrink-0 space-y-4">
          {/* Types section */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-3">Types</h3>
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              <button
                onClick={() => setSelectedType(null)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg text-sm transition-all shrink-0",
                  !selectedType ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                All Types
              </button>
              {types.map((type) => {
                const Icon = typeIcons[type];
                const count = trackableEntities?.filter(e => e.type === type).length || 0;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={cn(
                      "flex items-center justify-between gap-2 whitespace-nowrap px-3 py-2 rounded-lg text-sm transition-all w-full",
                      selectedType === type ? "bg-white/10 text-white font-medium" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4" /> {typeLabels[type]}
                    </span>
                    <span className="text-xs font-semibold bg-white/10 px-2 py-0.5 rounded">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : !filteredEntities || filteredEntities.length === 0 ? (
            <Card className="p-12 text-center">
              <FolderOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-white mb-2">No {selectedType ? typeLabels[selectedType].toLowerCase() + 's' : 'entities'} yet</h3>
              <p className="text-sm text-zinc-500 mb-4">
                Create a {selectedType ? typeLabels[selectedType].toLowerCase() : 'project or habit'} to start tracking time
              </p>
              <Button onClick={() => navigate('/entities/new')}>
                Create {selectedType ? typeLabels[selectedType] : 'Entity'}
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEntities.map(entity => {
                const summary = getSummaryForEntity(entity.id);
                const isEntityTimerActive = isTimerActive(entity.id);
                // Only show timer for Projects
                const showTimer = entity.type === 'PROJECT';

                return (
                  <Card
                    key={entity.id}
                    className={`p-4 cursor-pointer transition-all ${
                      isEntityTimerActive && showTimer
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

                      {/* Timer Controls - Only for Projects */}
                      {showTimer && (
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
                              navigate(`/entities/${entity.id}`);
                            }}
                            className="text-xs"
                          >
                            Details
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
