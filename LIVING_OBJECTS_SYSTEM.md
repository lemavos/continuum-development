# Sistema de Gestão de Objetos Vivos 🕸️

## Visão Geral

O Continuum agora conta com um sistema avançado de "Gestão de Objetos Vivos" que transforma notas passivas em entidades interativas. Este sistema diferencia o Continuum de ferramentas como Roam Research, permitindo mencionar e interagir com entidades de forma inteligente dentro do editor de notas.

## Arquitetura

### 1. Context Global (EntityContext)
**Arquivo:** `src/contexts/EntityContext.tsx`

Sistema de gerenciamento de estado usando React Context API:

```typescript
- activeMention: Entidade mencionada atualmente
- entitiesInNote: Entidades vinculadas à nota atual
- inspectorOpen: Estado do painel lateral
- inspectorEntity: Entidade aberta no inspetor
- loadingEntityId: ID da entidade sendo carregada
```

**Uso:**
```tsx
import { useEntityStore } from '@/contexts/EntityContext';

const { activeMention, openInspector, closeInspector } = useEntityStore();
```

### 2. Componentes Principais

#### EntityMentionSelector
**Arquivo:** `src/components/EntityMentionSelector.tsx`

Pop-over inteligente que surge ao digitar `@` no editor:

- **Filtro em tempo real:** Busca por título e descrição
- **Ícones visuais:** 🟢 Hábito, 🔵 Projeto, 🟡 Pessoa, 🟣 Conceito, 🟠 Organização
- **Animações:** Entrada com framer-motion, lista com efeito de cascata
- **Limitação:** Exibe até 8 entidades por vez

**Props:**
```typescript
interface EntityMentionSelectorProps {
  isOpen: boolean;
  query: string;
  entities: Entity[];
  onEntitySelect: (entity: Entity) => void;
  onQueryChange: (query: string) => void;
  isLoading?: boolean;
}
```

#### SideInspector
**Arquivo:** `src/components/SideInspector.tsx`

Painel lateral dinâmico que reage ao conteúdo do editor:

**Widgets por Tipo:**

1. **Hábito (HABIT)**
   - Sequência atual com ícone de trending
   - Total de completagens
   - Sequência máxima
   - Botão "Marcar como Feito Hoje"

2. **Projeto (PROJECT)**
   - Barra de progresso (45% padrão)
   - Próxima task pendente
   - Prazo estimado

3. **Pessoa (PERSON)**
   - Descrição/Informações
   - Última menção (2 dias atrás, etc.)
   - Botão "Ver Menções"

4. **Padrão (TOPIC, ORGANIZATION)**
   - Descrição da entidade
   - Informações de conexões

#### MentionBadge
**Arquivo:** `src/components/MentionBadge.tsx`

Badge customizado com backdrop-blur para renderizar menções:

- **Backdrop-blur:** Efeito de vidro esmerilhado
- **Cores por tipo:** Específicas para cada tipo de entidade
- **Animações:** Hover (scale-up), tap (scale-down)
- **Interativo:** Clique abre o inspetor

## Fluxo de Uso

### 1. Mencionando uma Entidade

```markdown
# Minha Nota

Estou trabalhando com @Stripe para processar pagamentos...
```

**Processo:**
1. Usuário digita `@`
2. Pop-over EntityMentionSelector abre
3. Usuário digita para filtrar: `@Str` → mostra "Stripe"
4. Clica ou pressiona Enter para selecionar
5. Texto é substituído por `[@Stripe](/entities/ENTITY_ID)`
6. SideInspector abre automaticamente mostrando detalhes

### 2. Interação com Menções

**Na visualização de menções:**
- Clique em um badge `@Entity` → abre o inspetor lateral
- O inspetor mostra widgets específicos baseado no tipo

**No inspetor (SideInspector):**
- Para hábitos: Clique "Marcar como Feito Hoje" → POST para `/api/entities/{id}/track`
- Para projetos: Verifica progresso e próximas tarefas
- Para pessoas: Acessa últimas menções e conexões

### 3. Salvamento Automático

A nota é salva automaticamente com extração de entidades:

```typescript
// Extrai IDs de entidades do conteúdo markdown
const entityIds = extractEntityIds(content);

// Envia para backend no corpo da requisição
await notesApi.update(id, { 
  title, 
  content, 
  entityIds // → relatedEntityIds no backend
});
```

## Integração com NoteEditor

**Componentes usados:**
```tsx
<EntityMentionSelector
  isOpen={mentionOpen}
  query={mentionQuery}
  entities={entities}
  onEntitySelect={insertMention}
  onQueryChange={setMentionQuery}
/>

<div className="flex gap-2 flex-wrap items-center">
  {linkedEntities.map((entity) => (
    <MentionBadge
      title={entity.title}
      type={entity.type}
    />
  ))}
</div>

<SideInspector
  isOpen={inspectorOpen}
  entity={inspectorEntity}
  onClose={closeInspector}
/>
```

## Animações e UX

### Framer Motion Integration
- **Pop-over entrada:** `opacity 0→1, scale 0.95→1` (150ms)
- **Itens da lista:** Cascata com delay (30ms entre itens)
- **SideInspector:** Slide-in de direita (250ms)
- **MentionBadges:** Scale 0.8→1 (entrance), scale-up em hover

### Efeitos Visuais
- **Backdrop-blur:** Usado em pop-over e sidebar para "vidro esmerilhado"
- **Cores por tipo:** Consistente com o resto da aplicação
- **Transições suaves:** Todos os estados com `transition-all`

## Configuração de Tipos de Entidade

**ENTITY_TYPE_CONFIG** é reutilizado em múltiplos componentes:

```typescript
HABIT: { label: 'Hábito', icon: '🟢', color: 'text-green-600', ... }
PROJECT: { label: 'Projeto', icon: '🔵', color: 'text-blue-600', ... }
PERSON: { label: 'Pessoa', icon: '🟡', color: 'text-yellow-600', ... }
TOPIC: { label: 'Conceito', icon: '🟣', color: 'text-purple-600', ... }
ORGANIZATION: { label: 'Organização', icon: '🟠', color: 'text-orange-600', ... }
```

## Próximas Fases (Roadmap)

### Fase 2: Active Transclusion
- "Log Entry" button funcional para hábitos
- POST `/api/entities/{id}/track` diretamente da nota

### Fase 3: Knowledge Graph (Command Map)
- Conexões tipadas com cores e linhas diferentes
- Filtros temporais (time slider)
- Modo de foco e expansão
- Detecção de clusters

### Fase 4: Backlinks Ativos
- Lista de backlinks no inspector
- Navegação bidirecional
- Visualização de relações

## Troubleshooting

### Pop-over não aparecendo
- Verifique se `EntityProvider` está envolvendo o app
- Confirme que `mentionOpen` está true
- Tire print do react devtools para ver o estado

### Inspector não mostrando dados
- Verifique se a entidade possui `id` válido
- Confirme que a chamada da API `/api/entities/{id}/stats` está funcionando
- Verifique se o tipo de entidade está no ENTITY_TYPE_CONFIG

### Badges não mostrando
- Confirme que `linkedEntities` não está vazio
- Verifique o tipo de entidade na database
- Teste com uma entidade conhecida primeiro

## Contribuindo

Ao adicionar novos tipos de entidades:
1. Atualize `EntityType` em `src/types/index.ts`
2. Adicione entrada em `ENTITY_TYPE_CONFIG`
3. Crie novo widget em `SideInspector` se necessário
4. Teste o flow completo de menção

---

**Desenvolvido com ❤️ para Continuum**
