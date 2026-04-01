import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import type { Entity, EntityType } from '@/types';
import { useEntityStore } from '@/contexts/EntityContext';

// Entity Type Configuration with icons and colors
const ENTITY_TYPE_CONFIG: Record<EntityType, { label: string; icon: string; color: string; bgColor: string; borderColor: string }> = {
  HABIT: { 
    label: 'Hábito', 
    icon: '🟢', 
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  PROJECT: { 
    label: 'Projeto', 
    icon: '🔵', 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  PERSON: { 
    label: 'Pessoa', 
    icon: '🟡', 
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  TOPIC: { 
    label: 'Conceito', 
    icon: '🟣', 
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  ORGANIZATION: { 
    label: 'Organização', 
    icon: '🟠', 
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
};

interface EntityMentionSelectorProps {
  isOpen: boolean;
  query: string;
  entities: Entity[];
  onEntitySelect: (entity: Entity) => void;
  onQueryChange: (query: string) => void;
  isLoading?: boolean;
  position?: { top: number; left: number };
}

export const EntityMentionSelector = memo(function EntityMentionSelector({
  isOpen,
  query,
  entities,
  onEntitySelect,
  onQueryChange,
  isLoading = false,
  position,
}: EntityMentionSelectorProps) {
  const { setActiveMention, addEntityToNote } = useEntityStore();

  const filteredEntities = useMemo(() => {
    if (!query) return entities.slice(0, 8);
    
    return entities
      .filter((entity) =>
        entity.title.toLowerCase().includes(query.toLowerCase()) ||
        entity.description?.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 8);
  }, [entities, query]);

  const handleSelect = (entity: Entity) => {
    setActiveMention({
      id: entity.id,
      title: entity.title,
      type: entity.type,
    });
    addEntityToNote(entity);
    onEntitySelect(entity);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed">
      <Popover open={isOpen}>
        <PopoverContent
          side="bottom"
          align="start"
          className="w-72 p-0 border border-border/80 backdrop-blur-md bg-background/95 shadow-lg"
        >
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-2 p-3"
            >
              {/* Search Input */}
              <div className="relative flex items-center gap-2">
                <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar entidade..."
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  className="pl-9 h-8 text-sm bg-background/50 border-0 focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>

              {/* Divider */}
              <div className="h-px bg-border/50" />

              {/* Entity List */}
              <ScrollArea className="h-auto max-h-[280px]">
                <div className="space-y-1 pr-4">
                  {isLoading ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center py-8"
                    >
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </motion.div>
                  ) : filteredEntities.length > 0 ? (
                    <motion.div className="space-y-1">
                      {filteredEntities.map((entity, idx) => {
                        const config = ENTITY_TYPE_CONFIG[entity.type];
                        return (
                          <motion.button
                            key={entity.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            onClick={() => handleSelect(entity)}
                            className={`w-full flex items-start gap-2 px-3 py-2 rounded-md text-left text-sm transition-all hover:${config.bgColor} hover:border hover:${config.borderColor} group cursor-pointer border border-transparent`}
                          >
                            <span className="text-lg leading-none mt-0.5 flex-shrink-0">{config.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground truncate">
                                {entity.title}
                              </div>
                              {entity.description && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {entity.description}
                                </div>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={`flex-shrink-0 text-xs ${config.color} border-current/20`}
                            >
                              {config.label}
                            </Badge>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-8 px-4 gap-2"
                    >
                      <Search className="w-4 h-4 text-muted-foreground/50" />
                      <p className="text-xs text-muted-foreground text-center">
                        Nenhuma entidade encontrada
                      </p>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>

              {/* Footer hint */}
              <div className="h-px bg-border/50" />
              <div className="text-xs text-muted-foreground px-3 py-1.5">
                {filteredEntities.length === 0
                  ? 'Digite para buscar entidades'
                  : `${filteredEntities.length} entidade${filteredEntities.length !== 1 ? 's' : ''} encontrada${filteredEntities.length !== 1 ? 's' : ''}`}
              </div>
            </motion.div>
          </AnimatePresence>
        </PopoverContent>
      </Popover>
    </div>
  );
});

EntityMentionSelector.displayName = 'EntityMentionSelector';
