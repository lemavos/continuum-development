import { memo, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search } from 'lucide-react';
import type { Entity, EntityType } from '@/types';
import { useEntityStore } from '@/contexts/EntityContext';

const ENTITY_TYPE_CONFIG: Record<EntityType, { label: string; icon: string; hoverBg: string; hoverBorder: string }> = {
  HABIT: { label: 'Hábito', icon: '🟢', hoverBg: 'rgba(16,185,129,0.08)', hoverBorder: 'rgba(16,185,129,0.3)' },
  PROJECT: { label: 'Projeto', icon: '🔵', hoverBg: 'rgba(59,130,246,0.08)', hoverBorder: 'rgba(59,130,246,0.3)' },
  PERSON: { label: 'Pessoa', icon: '🟡', hoverBg: 'rgba(245,158,11,0.08)', hoverBorder: 'rgba(245,158,11,0.3)' },
  TOPIC: { label: 'Conceito', icon: '🟣', hoverBg: 'rgba(139,92,246,0.08)', hoverBorder: 'rgba(139,92,246,0.3)' },
  ORGANIZATION: { label: 'Organização', icon: '🟠', hoverBg: 'rgba(249,115,22,0.08)', hoverBorder: 'rgba(249,115,22,0.3)' },
};

const BADGE_COLORS: Record<EntityType, string> = {
  HABIT: '#10b981',
  PROJECT: '#3b82f6',
  PERSON: '#f59e0b',
  TOPIC: '#8b5cf6',
  ORGANIZATION: '#f97316',
};

interface EntityMentionSelectorProps {
  isOpen: boolean;
  query: string;
  entities: Entity[];
  onEntitySelect: (entity: Entity) => void;
  onQueryChange: (query: string) => void;
  isLoading?: boolean;
}

export const EntityMentionSelector = memo(function EntityMentionSelector({
  isOpen,
  query,
  entities,
  onEntitySelect,
  onQueryChange,
  isLoading = false,
}: EntityMentionSelectorProps) {
  const { setActiveMention, addEntityToNote } = useEntityStore();
  const listRef = useRef<HTMLDivElement>(null);

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
    setActiveMention({ id: entity.id, title: entity.title, type: entity.type });
    addEntityToNote(entity);
    onEntitySelect(entity);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.12 }}
        className="absolute left-0 z-50 w-72 rounded-lg border border-border/80 bg-popover shadow-lg backdrop-blur-md"
        style={{ bottom: '100%', marginBottom: 8 }}
      >
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            placeholder="Buscar entidade..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            autoFocus
          />
        </div>

        {/* List */}
        <ScrollArea className="max-h-[260px]">
          <div ref={listRef} className="p-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEntities.length > 0 ? (
              filteredEntities.map((entity, idx) => {
                const config = ENTITY_TYPE_CONFIG[entity.type];
                const badgeColor = BADGE_COLORS[entity.type] || '#888';
                return (
                  <button
                    key={entity.id}
                    onClick={() => handleSelect(entity)}
                    className="w-full flex items-start gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors cursor-pointer"
                    style={{ ['--hover-bg' as string]: config.hoverBg }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = config.hoverBg;
                      e.currentTarget.style.borderColor = config.hoverBorder;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <span className="text-base leading-none mt-0.5 shrink-0">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">{entity.title}</div>
                      {entity.description && (
                        <div className="text-xs text-muted-foreground truncate">{entity.description}</div>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs" style={{ color: badgeColor, borderColor: `${badgeColor}33` }}>
                      {config.label}
                    </Badge>
                  </button>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-6 gap-1">
                <Search className="w-4 h-4 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">Nenhuma entidade encontrada</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-border/50 text-xs text-muted-foreground">
          {filteredEntities.length === 0
            ? 'Digite para buscar entidades'
            : `${filteredEntities.length} encontrada${filteredEntities.length !== 1 ? 's' : ''}`}
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
