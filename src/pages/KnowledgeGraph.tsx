import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { graphApi, entitiesApi } from "@/lib/api";
import { Loader2, ZoomIn, ZoomOut, Maximize2, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SideInspector } from "@/components/SideInspector";
import { useEntityStore } from "@/contexts/EntityContext";
import type { Entity } from "@/types";

interface GraphNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface GraphData {
  nodes: { id: string; label: string; type: string }[];
  edges?: { source: string; target: string }[];
  links?: { source: string; target: string }[];
}

const TYPE_COLORS: Record<string, string> = {
  NOTE: "hsl(174, 100%, 41%)",
  ENTITY: "hsl(174, 100%, 41%)",
  HABIT: "hsl(130, 60%, 50%)",
  PERSON: "hsl(45, 100%, 60%)",
  PROJECT: "hsl(174, 100%, 41%)",
  TOPIC: "hsl(270, 60%, 60%)",
  ORGANIZATION: "hsl(25, 90%, 55%)",
};

const TYPE_LABELS: Record<string, string> = {
  NOTE: "Nota",
  ENTITY: "Entidade",
  HABIT: "Hábito",
  PERSON: "Pessoa",
  PROJECT: "Projeto",
  TOPIC: "Conceito",
  ORGANIZATION: "Organização",
};

const TYPE_RADIUS: Record<string, number> = {
  NOTE: 6, ENTITY: 8, HABIT: 7, PERSON: 8, PROJECT: 9, TOPIC: 7, ORGANIZATION: 8,
};

export default function KnowledgeGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphStats, setGraphStats] = useState({ nodes: 0, edges: 0 });
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // SideInspector integration
  const { inspectorOpen, inspectorEntity, openInspector, closeInspector } = useEntityStore();
  const [allEntities, setAllEntities] = useState<Entity[]>([]);

  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const draggingRef = useRef<GraphNode | null>(null);
  const panningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);
  const selectedRef = useRef<GraphNode | null>(null);
  const hoveredRef = useRef<GraphNode | null>(null);

  // Keep refs in sync for draw callback
  useEffect(() => { selectedRef.current = selectedNode; }, [selectedNode]);
  useEffect(() => { hoveredRef.current = hoveredNode; }, [hoveredNode]);

  // Compute neighbor set for highlighting
  const neighborIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const edges = Array.isArray(edgesRef.current) ? edgesRef.current : [];
    const ids = new Set<string>();
    ids.add(selectedNode.id);
    for (const e of edges) {
      if (e.source === selectedNode.id) ids.add(e.target);
      if (e.target === selectedNode.id) ids.add(e.source);
    }
    return ids;
  }, [selectedNode]);

  const neighborIdsRef = useRef(neighborIds);
  useEffect(() => { neighborIdsRef.current = neighborIds; }, [neighborIds]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const z = zoomRef.current;
    const p = panRef.current;
    return { x: (sx - p.x) / z, y: (sy - p.y) / z };
  }, []);

  const findNodeAt = useCallback((sx: number, sy: number) => {
    const w = screenToWorld(sx, sy);
    const z = zoomRef.current;
    const nodes = Array.isArray(nodesRef.current) ? nodesRef.current : [];
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const r = (TYPE_RADIUS[n.type] || 6) + 4 / z;
      const dx = n.x - w.x;
      const dy = n.y - w.y;
      if (dx * dx + dy * dy < r * r) return n;
    }
    return null;
  }, [screenToWorld]);

  const simulate = useCallback(() => {
    const nodes = Array.isArray(nodesRef.current) ? nodesRef.current : [];
    const edges = Array.isArray(edgesRef.current) ? edgesRef.current : [];
    if (nodes.length === 0) return;

    const repulsion = 1200;
    const attraction = 0.004;
    const idealLen = 140;
    const damping = 0.88;
    const centerForce = 0.008;
    const alpha = 0.25;

    // Center gravity
    for (const n of nodes) {
      n.vx -= n.x * centerForce;
      n.vy -= n.y * centerForce;
    }

    // Repulsion (all pairs)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx -= fx; a.vy -= fy;
        b.vx += fx; b.vy += fy;
      }
    }

    // Attraction (edges)
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    for (const e of edges) {
      const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - idealLen) * attraction;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }

    // Velocity + position update
    for (const n of nodes) {
      if (n === draggingRef.current) continue;
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx * alpha;
      n.y += n.vy * alpha;
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(panRef.current.x, panRef.current.y);
    ctx.scale(zoomRef.current, zoomRef.current);

    const nodes = Array.isArray(nodesRef.current) ? nodesRef.current : [];
    const edges = Array.isArray(edgesRef.current) ? edgesRef.current : [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const selected = selectedRef.current;
    const hovered = hoveredRef.current;
    const neighbors = neighborIdsRef.current;
    const hasSelection = selected !== null;

    // Draw edges
    for (const e of edges) {
      const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
      if (!a || !b) continue;

      const isHighlighted = hasSelection && neighbors.has(e.source) && neighbors.has(e.target);
      ctx.strokeStyle = hasSelection
        ? (isHighlighted ? "rgba(0,209,193,0.25)" : "rgba(255,255,255,0.02)")
        : "rgba(0,209,193,0.1)";
      ctx.lineWidth = (isHighlighted ? 1.5 : 0.5) / zoomRef.current;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Draw nodes
    for (const n of nodes) {
      const r = TYPE_RADIUS[n.type] || 6;
      const color = TYPE_COLORS[n.type] || "hsl(0,0%,40%)";
      const isHovered = hovered?.id === n.id;
      const isSelected = selected?.id === n.id;
      const isNeighbor = hasSelection && neighbors.has(n.id);
      const dimmed = hasSelection && !isNeighbor;

      const drawRadius = isHovered || isSelected ? r + 3 : r;
      const alpha = dimmed ? 0.15 : 1;

      // Glow for selected/hovered
      if ((isSelected || isHovered) && !dimmed) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius + 6, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2 / zoomRef.current;
        ctx.stroke();
      }

      // Labels
      const showLabel = zoomRef.current > 0.4 || isHovered || isSelected || isNeighbor;
      if (showLabel) {
        const fontSize = Math.max(10, 11 / zoomRef.current);
        ctx.font = `${isSelected || isHovered ? "600" : "400"} ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = dimmed ? "rgba(255,255,255,0.1)" : (isSelected || isHovered ? "#ffffff" : "rgba(255,255,255,0.5)");
        ctx.fillText(n.label.length > 18 ? n.label.slice(0, 17) + "…" : n.label, n.x, n.y + drawRadius + fontSize + 2);
      }
      ctx.restore();
    }

    ctx.restore();
  }, []);

  const tick = useCallback(() => {
    simulate();
    draw();
    animFrameRef.current = requestAnimationFrame(tick);
  }, [simulate, draw]);

  // Load data
  useEffect(() => {
    Promise.all([graphApi.data(), entitiesApi.list()])
      .then(([graphRes, entitiesRes]) => {
        const data: GraphData = graphRes.data;
        const entities = Array.isArray(entitiesRes.data) ? entitiesRes.data : [];
        setAllEntities(entities);

        const rawNodes = Array.isArray(data?.nodes) ? data.nodes : [];
        const rawEdges = Array.isArray(data?.links) ? data.links : (Array.isArray(data?.edges) ? data.edges : []);

        if (rawNodes.length === 0) {
          setEmpty(true);
          setLoading(false);
          return;
        }

        // Spread nodes around origin
        const nextNodes: GraphNode[] = rawNodes.map((n) => ({
          ...n,
          x: (Math.random() - 0.5) * 400,
          y: (Math.random() - 0.5) * 400,
          vx: 0,
          vy: 0,
        }));

        nodesRef.current = nextNodes;
        edgesRef.current = rawEdges;
        setGraphStats({ nodes: nextNodes.length, edges: rawEdges.length });

        // Center pan on the canvas
        const canvas = canvasRef.current;
        const cw = canvas?.clientWidth || 800;
        const ch = canvas?.clientHeight || 600;
        panRef.current = { x: cw / 2, y: ch / 2 };
        zoomRef.current = 1;
        setLoading(false);
      })
      .catch(() => {
        setEmpty(true);
        setGraphStats({ nodes: 0, edges: 0 });
        setLoading(false);
      });
  }, []);

  // Animation loop
  useEffect(() => {
    if (loading || empty) return;
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [loading, empty, tick]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      // Redraw on resize
      draw();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);

    // Try to find entity in allEntities to open inspector
    const entity = allEntities.find(e => e.id === node.id);
    if (entity) {
      openInspector(entity);
    } else {
      // For NOTE nodes or unmatched nodes, create a synthetic entity for the inspector
      openInspector({
        id: node.id,
        title: node.label,
        type: node.type as any,
        createdAt: new Date().toISOString(),
        ownerId: "",
      });
    }
  }, [allEntities, openInspector]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const node = findNodeAt(sx, sy);
    if (node) {
      draggingRef.current = node;
      handleNodeClick(node);
    } else {
      panningRef.current = true;
      setSelectedNode(null);
      closeInspector();
    }
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;

    if (draggingRef.current) {
      const w = screenToWorld(sx, sy);
      draggingRef.current.x = w.x;
      draggingRef.current.y = w.y;
      draggingRef.current.vx = 0;
      draggingRef.current.vy = 0;
    } else if (panningRef.current) {
      panRef.current.x += e.clientX - lastMouseRef.current.x;
      panRef.current.y += e.clientY - lastMouseRef.current.y;
    } else {
      const node = findNodeAt(sx, sy);
      setHoveredNode(node);
      setTooltipPos(node ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = node ? "pointer" : "grab";
      }
    }
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    draggingRef.current = null;
    panningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const oldZ = zoomRef.current;
    const newZ = Math.max(0.15, Math.min(5, oldZ * (e.deltaY < 0 ? 1.1 : 0.9)));
    panRef.current.x = sx - (sx - panRef.current.x) * (newZ / oldZ);
    panRef.current.y = sy - (sy - panRef.current.y) * (newZ / oldZ);
    zoomRef.current = newZ;
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const node = findNodeAt(sx, sy);
    if (!node) return;
    if (node.type === "NOTE") navigate(`/notes/${node.id}`);
    else navigate(`/entities/${node.id}`);
  };

  const handleZoom = (dir: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.clientWidth / 2, cy = canvas.clientHeight / 2;
    const oldZ = zoomRef.current;
    const newZ = Math.max(0.15, Math.min(5, oldZ * (dir > 0 ? 1.3 : 0.7)));
    panRef.current.x = cx - (cx - panRef.current.x) * (newZ / oldZ);
    panRef.current.y = cy - (cy - panRef.current.y) * (newZ / oldZ);
    zoomRef.current = newZ;
  };

  const handleReset = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    panRef.current = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 };
    zoomRef.current = 1;
  };

  // Touch support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = touch.clientX - rect.left, sy = touch.clientY - rect.top;
    const node = findNodeAt(sx, sy);
    if (node) {
      draggingRef.current = node;
      handleNodeClick(node);
    } else {
      panningRef.current = true;
      setSelectedNode(null);
      closeInspector();
    }
    lastMouseRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = touch.clientX - rect.left, sy = touch.clientY - rect.top;
    if (draggingRef.current) {
      const w = screenToWorld(sx, sy);
      draggingRef.current.x = w.x;
      draggingRef.current.y = w.y;
      draggingRef.current.vx = 0;
      draggingRef.current.vy = 0;
    } else if (panningRef.current) {
      panRef.current.x += touch.clientX - lastMouseRef.current.x;
      panRef.current.y += touch.clientY - lastMouseRef.current.y;
    }
    lastMouseRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = () => {
    draggingRef.current = null;
    panningRef.current = false;
  };

  // Legend items from actual data
  const legendTypes = useMemo(() => {
    const nodes = Array.isArray(nodesRef.current) ? nodesRef.current : [];
    const types = new Set(nodes.map(n => n.type));
    return Array.from(types).map(t => ({
      type: t,
      label: TYPE_LABELS[t] || t,
      color: TYPE_COLORS[t] || "hsl(0,0%,40%)",
    }));
  }, [graphStats]); // recalc when stats change

  return (
    <AppLayout>
      <div className="flex flex-col" style={{ height: "calc(100vh - 3.5rem)" }}>
        {/* Header */}
        <div className="p-3 lg:p-4 flex items-center justify-between border-b border-border/50 shrink-0">
          <div>
            <h1 className="font-display text-lg lg:text-xl font-semibold tracking-tight text-foreground">
              Grafo de Conhecimento
            </h1>
            <p className="text-xs text-muted-foreground">
              {graphStats.nodes} nós · {graphStats.edges} conexões
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleZoom(1)}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleZoom(-1)}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleReset}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Graph area */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden min-h-0">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Carregando grafo...</p>
              </div>
            </div>
          )}

          {empty && !loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center space-y-4 max-w-xs px-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Brain className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Nenhuma conexão detectada ainda
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Comece a criar notas e mencionar entidades com <span className="text-primary font-medium">@</span> para ver seu cérebro crescer.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border/50"
                  onClick={() => navigate("/notes")}
                >
                  Criar primeira nota →
                </Button>
              </div>
            </div>
          )}

          {!empty && (
            <canvas
              ref={canvasRef}
              className="w-full h-full bg-background"
              style={{ display: "block" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onDoubleClick={handleDoubleClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          )}

          {/* Tooltip on hover */}
          {hoveredNode && tooltipPos && !selectedNode && (
            <div
              className="absolute z-20 pointer-events-none px-3 py-1.5 rounded-lg bg-popover/95 backdrop-blur-sm border border-border/50 shadow-lg"
              style={{
                left: Math.min(tooltipPos.x + 12, (containerRef.current?.clientWidth || 300) - 160),
                top: tooltipPos.y - 36,
              }}
            >
              <p className="text-xs font-medium text-foreground truncate max-w-[140px]">
                {hoveredNode.label}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {TYPE_LABELS[hoveredNode.type] || hoveredNode.type}
              </p>
            </div>
          )}

          {/* Legend */}
          {!empty && legendTypes.length > 0 && (
            <div className="absolute bottom-3 left-3 bento-card p-2.5 space-y-1 max-w-[140px]">
              <p className="text-[10px] font-medium text-foreground mb-1 uppercase tracking-wider">Legenda</p>
              {legendTypes.map(({ type, label, color }) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
              <p className="text-[9px] text-muted-foreground pt-1 border-t border-border/50">
                Clique para inspecionar · Duplo-clique para abrir
              </p>
            </div>
          )}

          {/* Selected node info card (mobile-friendly) */}
          {selectedNode && !inspectorOpen && (
            <div className="absolute top-3 right-3 bento-card p-3 w-48 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[selectedNode.type] }} />
                <p className="text-sm font-medium text-foreground truncate">{selectedNode.label}</p>
              </div>
              <p className="text-xs text-muted-foreground">{TYPE_LABELS[selectedNode.type] || selectedNode.type}</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs border-border/50"
                onClick={() => {
                  if (selectedNode.type === "NOTE") navigate(`/notes/${selectedNode.id}`);
                  else navigate(`/entities/${selectedNode.id}`);
                }}
              >
                Abrir →
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* SideInspector */}
      <SideInspector
        isOpen={inspectorOpen}
        entity={inspectorEntity}
        onClose={() => {
          closeInspector();
          setSelectedNode(null);
        }}
      />
    </AppLayout>
  );
}
