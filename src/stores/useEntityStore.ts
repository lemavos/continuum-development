import { create } from 'zustand';
import type { Entity } from '@/types';

export interface MentionedEntity {
  id: string;
  title: string;
  type: string;
  cursorPosition?: number;
}

export interface EntityStoreState {
  // Global mention state
  activeMention: MentionedEntity | null;
  hoveredMentionId: string | null;
  
  // Session entities
  entitiesInNote: Entity[];
  
  // Inspector state
  inspectorOpen: boolean;
  inspectorEntity: Entity | null;
  
  // Loading states
  loadingEntityId: string | null;
  
  // Actions
  setActiveMention: (mention: MentionedEntity | null) => void;
  setHoveredMentionId: (id: string | null) => void;
  setEntitiesInNote: (entities: Entity[]) => void;
  addEntityToNote: (entity: Entity) => void;
  removeEntityFromNote: (entityId: string) => void;
  
  // Inspector actions
  openInspector: (entity: Entity) => void;
  closeInspector: () => void;
  setLoadingEntityId: (id: string | null) => void;
}

export const useEntityStore = create<EntityStoreState>((set) => ({
  // Initial state
  activeMention: null,
  hoveredMentionId: null,
  entitiesInNote: [],
  inspectorOpen: false,
  inspectorEntity: null,
  loadingEntityId: null,
  
  // Actions
  setActiveMention: (mention) => set({ activeMention: mention }),
  setHoveredMentionId: (id) => set({ hoveredMentionId: id }),
  
  setEntitiesInNote: (entities) => set({ entitiesInNote: entities }),
  
  addEntityToNote: (entity) => set((state) => ({
    entitiesInNote: [...state.entitiesInNote, entity].filter(
      (e, idx, arr) => arr.findIndex(a => a.id === e.id) === idx
    ),
  })),
  
  removeEntityFromNote: (entityId) => set((state) => ({
    entitiesInNote: state.entitiesInNote.filter(e => e.id !== entityId),
  })),
  
  openInspector: (entity) => set({ 
    inspectorOpen: true, 
    inspectorEntity: entity,
    activeMention: { id: entity.id, title: entity.title, type: entity.type },
  }),
  
  closeInspector: () => set({ 
    inspectorOpen: false, 
    inspectorEntity: null,
    activeMention: null,
  }),
  
  setLoadingEntityId: (id) => set({ loadingEntityId: id }),
}));
