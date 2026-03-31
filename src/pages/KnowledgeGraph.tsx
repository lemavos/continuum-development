import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { graphApi } from "@/lib/api";
import { Loader2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface GraphNode { id: string; label: string; type: "NOTE" | "ENTITY" | "HABIT"; x: number; y: number; vx: number; vy: number; }
interface GraphEdge { source: string; target: string; }
interface GraphData { nodes: { id: string; label: string; type: string }[]; edges: { source: string; target: string }[]; }

const TYPE_COLORS: Record<string, string> = {
  NOTE: "hsl(174, 100%, 41%)",
  ENTITY: "hsl(174, 100%, 41%)",
  HABIT: "hsl(45, 100%, 60%)",
  PERSON: "hsl(174, 100%, 41%)",
  PROJECT: "hsl(45, 100%, 60%)",
  TOPIC: "hsl(0, 0%, 40%)",
  ORGANIZATION: "hsl(174, 100%, 41%)",
};

const TYPE_RADIUS: Record<string, number> = { NOTE: 6, ENTITY: 8, HABIT: 7, PERSON: 8, PROJECT: 8, TOPIC: 6, ORGANIZATION: 8 };

export default function KnowledgeGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphStats, setGraphStats] = useState({ nodes: 0, edges: 0 });

  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const draggingRef = useRef<GraphNode | null>(null);
  const panningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const z = zoomRef.current; const p = panRef.current;
    return { x: (sx - p.x) / z, y: (sy - p.y) / z };
  }, []);

  const findNodeAt = useCallback((sx: number, sy: number) => {
    const w = screenToWorld(sx, sy); const z = zoomRef.current;
    const nodes = Array.isArray(nodesRef.current) ? nodesRef.current : [];
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]; const r = (TYPE_RADIUS[n.type] || 6) / z + 4;
      const dx = n.x - w.x; const dy = n.y - w.y;
      if (dx * dx + dy * dy < r * r * z * z) return n;
    }
    return null;
  }, [screenToWorld]);

  const simulate = useCallback(() => {
    const nodes = Array.isArray(nodesRef.current) ? nodesRef.current : [];
    const edges = Array.isArray(edgesRef.current) ? edgesRef.current : [];
    const alpha = 0.3; const repulsion = 800; const attraction = 0.005; const idealLen = 120; const damping = 0.85; const centerForce = 0.01;
    for (const n of nodes) { n.vx -= n.x * centerForce; n.vy -= n.y * centerForce; }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force; const fy = (dy / dist) * force;
        a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
      }
    }
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    for (const e of edges) {
      const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - idealLen) * attraction;
      const fx = (dx / dist) * force; const fy = (dy / dist) * force;
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
    }
    for (const n of nodes) {
      if (n === draggingRef.current) continue;
      n.vx *= damping; n.vy *= damping; n.x += n.vx * alpha; n.y += n.vy * alpha;
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth; const h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    ctx.save(); ctx.translate(panRef.current.x, panRef.current.y); ctx.scale(zoomRef.current, zoomRef.current);
    const nodes = Array.isArray(nodesRef.current) ? nodesRef.current : [];
    const edges = Array.isArray(edgesRef.current) ? edgesRef.current : [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    ctx.strokeStyle = "rgba(0,209,193,0.08)"; ctx.lineWidth = 1 / zoomRef.current;
    for (const e of edges) {
      const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
      if (!a || !b) continue;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    for (const n of nodes) {
      const r = TYPE_RADIUS[n.type] || 6;
      const color = TYPE_COLORS[n.type] || "hsl(0,0%,40%)";
      const isHovered = hoveredNode?.id === n.id;
      const isSelected = selectedNode?.id === n.id;
      ctx.beginPath(); ctx.arc(n.x, n.y, isHovered || isSelected ? r + 2 : r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      if (isSelected) { ctx.strokeStyle = "hsl(174,100%,41%)"; ctx.lineWidth = 2 / zoomRef.current; ctx.stroke(); }
      if (zoomRef.current > 0.5 || isHovered || isSelected) {
        ctx.fillStyle = "hsl(0,0%,60%)"; ctx.font = `${11 / zoomRef.current}px Inter, sans-serif`;
        ctx.textAlign = "center"; ctx.fillText(n.label.slice(0, 20), n.x, n.y + r + 14 / zoomRef.current);
      }
    }
    ctx.restore();
  }, [hoveredNode, selectedNode]);

  const tick = useCallback(() => { simulate(); draw(); animFrameRef.current = requestAnimationFrame(tick); }, [simulate, draw]);

  useEffect(() => {
    graphApi.data().then(({ data }: { data: GraphData }) => {
      const canvas = canvasRef.current; const cw = canvas?.clientWidth || 800; const ch = canvas?.clientHeight || 600;
      const nextNodes = Array.isArray(data?.nodes)
        ? data.nodes.map((n) => ({ ...n, type: n.type as GraphNode["type"], x: cw / 2 + (Math.random() - 0.5) * 300, y: ch / 2 + (Math.random() - 0.5) * 300, vx: 0, vy: 0 }))
        : [];
      const nextEdges = Array.isArray(data?.edges) ? data.edges : [];
      nodesRef.current = nextNodes;
      edgesRef.current = nextEdges;
      setGraphStats({ nodes: nextNodes.length, edges: nextEdges.length });
      panRef.current = { x: cw / 2, y: ch / 2 }; zoomRef.current = 1; setLoading(false);
    }).catch(() => { setGraphStats({ nodes: 0, edges: 0 }); toast({ title: "Erro ao carregar grafo", variant: "destructive" }); setLoading(false); });
  }, []);

  useEffect(() => {
    if (loading) return;
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [loading, tick]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const node = findNodeAt(sx, sy);
    if (node) { draggingRef.current = node; setSelectedNode(node); } else { panningRef.current = true; setSelectedNode(null); }
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    if (draggingRef.current) { const w = screenToWorld(sx, sy); draggingRef.current.x = w.x; draggingRef.current.y = w.y; draggingRef.current.vx = 0; draggingRef.current.vy = 0; }
    else if (panningRef.current) { panRef.current.x += e.clientX - lastMouseRef.current.x; panRef.current.y += e.clientY - lastMouseRef.current.y; }
    else { const node = findNodeAt(sx, sy); setHoveredNode(node); if (canvasRef.current) canvasRef.current.style.cursor = node ? "pointer" : "grab"; }
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => { draggingRef.current = null; panningRef.current = false; };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault(); const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const oldZ = zoomRef.current; const newZ = Math.max(0.2, Math.min(4, oldZ * (e.deltaY < 0 ? 1.1 : 0.9)));
    panRef.current.x = sx - (sx - panRef.current.x) * (newZ / oldZ); panRef.current.y = sy - (sy - panRef.current.y) * (newZ / oldZ);
    zoomRef.current = newZ;
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const node = findNodeAt(sx, sy); if (!node) return;
    if (node.type === "NOTE") navigate(`/notes/${node.id}`); else navigate(`/entities/${node.id}`);
  };

  const handleZoom = (dir: number) => { zoomRef.current = Math.max(0.2, Math.min(4, zoomRef.current * (dir > 0 ? 1.3 : 0.7))); };
  const handleReset = () => { const canvas = canvasRef.current; if (!canvas) return; panRef.current = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 }; zoomRef.current = 1; };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="p-4 lg:p-6 flex items-center justify-between border-b border-border/50 shrink-0">
          <div>
            <h1 className="font-display text-xl lg:text-2xl font-semibold tracking-tight text-foreground">Grafo de Conhecimento</h1>
            <p className="text-xs text-muted-foreground">{graphStats.nodes} nós · {graphStats.edges} conexões</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleZoom(1)}><ZoomIn className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleZoom(-1)}><ZoomOut className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleReset}><Maximize2 className="w-4 h-4" /></Button>
          </div>
        </div>

        <div ref={containerRef} className="flex-1 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          <canvas ref={canvasRef} className="w-full h-full bg-background" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} onDoubleClick={handleDoubleClick} />

          <div className="absolute bottom-4 left-4 bento-card p-3 space-y-1.5">
            <p className="text-xs font-medium text-foreground mb-1">Legenda</p>
            {[{ type: "NOTE", label: "Nota" }, { type: "ENTITY", label: "Entidade" }, { type: "HABIT", label: "Hábito" }].map(({ type, label }) => (
              <div key={type} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] }} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">Duplo-clique para abrir</p>
          </div>

          {selectedNode && (
            <div className="absolute top-4 right-4 bento-card p-4 w-56 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[selectedNode.type] }} />
                <p className="text-sm font-medium text-foreground truncate">{selectedNode.label}</p>
              </div>
              <p className="text-xs text-muted-foreground">{selectedNode.type}</p>
              <Button size="sm" variant="outline" className="w-full text-xs border-border/50" onClick={() => {
                if (selectedNode.type === "NOTE") navigate(`/notes/${selectedNode.id}`); else navigate(`/entities/${selectedNode.id}`);
              }}>Abrir →</Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
