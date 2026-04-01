import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, TrendingUp, CheckCircle2, AlertCircle, Link2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { entitiesApi } from '@/lib/api';
import type { Entity, EntityStats, HeatmapData } from '@/types';
import { useEntityStore } from '@/contexts/EntityContext';

const ENTITY_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  HABIT: { label: 'Hábito', icon: '🟢', color: 'from-green-500 to-green-600', bgColor: 'bg-green-50' },
  PROJECT: { label: 'Projeto', icon: '🔵', color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50' },
  PERSON: { label: 'Pessoa', icon: '🟡', color: 'from-yellow-500 to-yellow-600', bgColor: 'bg-yellow-50' },
  TOPIC: { label: 'Conceito', icon: '🟣', color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50' },
  ORGANIZATION: { label: 'Organização', icon: '🟠', color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50' },
};

interface HabitWidgetProps {
  entity: Entity;
  stats: EntityStats;
}

const HabitWidget = memo(function HabitWidget({ entity, stats }: HabitWidgetProps) {
  const [heatmapData, setHeatmapData] = useState<HeatmapData>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Fetch heatmap data for last 90 days
    const to = new Date();
    const from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    entitiesApi
      .heatmap(entity.id, from.toISOString().split('T')[0], to.toISOString().split('T')[0])
      .then((res) => setHeatmapData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [entity.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Streak Card */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Sequência Atual</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-3xl font-bold text-green-600">{stats.currentStreak}</div>
          <p className="text-xs text-muted-foreground">dias consecutivos</p>
          <div className="mt-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Total de completagens:</span>
              <span className="font-semibold">{stats.totalCompletions}</span>
            </div>
            <div className="flex justify-between">
              <span>Sequência máxima:</span>
              <span className="font-semibold">{stats.longestStreak}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Heatmap Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Últimos 90 Dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-16 bg-muted rounded animate-pulse" />
          ) : (
            <div className="text-xs text-muted-foreground">
              Visualização de atividade disponível no Dashboard
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Entry Button */}
      <Button className="w-full bg-green-600 hover:bg-green-700 gap-2">
        <CheckCircle2 className="w-4 h-4" />
        Marcar como Feito Hoje
      </Button>
    </motion.div>
  );
});

interface ProjectWidgetProps {
  entity: Entity;
}

const ProjectWidget = memo(function ProjectWidget({ entity }: ProjectWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Progresso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-medium">Conclusão Geral</span>
              <span className="text-xs font-bold text-blue-600">45%</span>
            </div>
            <Progress value={45} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ArrowRight className="w-4 h-4" />
            Próxima Task
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Implementar integração com API
            </p>
            <p className="text-xs text-muted-foreground">
              Prazo: 15 dias
            </p>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
        <ArrowRight className="w-4 h-4" />
        Abrir Projeto
      </Button>
    </motion.div>
  );
});

interface PersonWidgetProps {
  entity: Entity;
}

const PersonWidget = memo(function PersonWidget({ entity }: PersonWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entity.description && (
            <p className="text-sm text-foreground">{entity.description}</p>
          )}
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs text-muted-foreground">
              Última menção: 2 dias atrás
            </p>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full bg-yellow-600 hover:bg-yellow-700 gap-2 variant:outline">
        <Link2 className="w-4 h-4" />
        Ver Menções
      </Button>
    </motion.div>
  );
});

const DefaultWidget = memo(function DefaultWidget({ entity }: { entity: Entity }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Descrição</CardTitle>
        </CardHeader>
        <CardContent>
          {entity.description ? (
            <p className="text-sm text-foreground">{entity.description}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">Sem descrição</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Conexões</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Conectada em múltiplas notas e projetos
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
});

interface SideInspectorProps {
  isOpen: boolean;
  entity: Entity | null;
  onClose: () => void;
}

export const SideInspector = memo(function SideInspector({ isOpen, entity, onClose }: SideInspectorProps) {
  const [stats, setStats] = useState<EntityStats | null>(null);
  const [loading, setLoading] = useState(false);
  const { loadingEntityId, setLoadingEntityId } = useEntityStore();

  useEffect(() => {
    if (!entity) return;

    setLoading(true);
    setLoadingEntityId(entity.id);

    Promise.all([
      entity.type === 'HABIT' ? entitiesApi.stats(entity.id) : Promise.resolve(null),
    ])
      .then(([statsRes]) => {
        if (statsRes) {
          setStats(statsRes.data);
        }
      })
      .catch(() => {
        setStats(null);
      })
      .finally(() => {
        setLoading(false);
        setLoadingEntityId(null);
      });
  }, [entity, setLoadingEntityId]);

  if (!entity) return null;

  const config = ENTITY_TYPE_CONFIG[entity.type] || ENTITY_TYPE_CONFIG.TOPIC;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 320 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 320 }}
          transition={{ duration: 0.25 }}
          className="fixed right-0 top-0 bottom-0 w-80 border-l border-border bg-background/95 backdrop-blur-sm shadow-lg z-40"
        >
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{config.icon}</span>
                    <Badge variant="outline" className="text-xs">
                      {config.label}
                    </Badge>
                  </div>
                  <h2 className="font-bold text-lg truncate text-foreground">
                    {entity.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Criado em {new Date(entity.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="mt-1 p-1.5 hover:bg-muted rounded-md transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              </div>

              {/* Divider */}
              <div className="h-px bg-border/50" />

              {/* Content - Type-specific widgets */}
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  {entity.type === 'HABIT' && stats && (
                    <HabitWidget entity={entity} stats={stats} />
                  )}
                  {entity.type === 'PROJECT' && (
                    <ProjectWidget entity={entity} />
                  )}
                  {entity.type === 'PERSON' && (
                    <PersonWidget entity={entity} />
                  )}
                  {!['HABIT', 'PROJECT', 'PERSON'].includes(entity.type) && (
                    <DefaultWidget entity={entity} />
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

SideInspector.displayName = 'SideInspector';
