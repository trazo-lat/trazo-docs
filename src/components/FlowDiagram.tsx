import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
  Position,
  MarkerType,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';

export type FlowNode = {
  id: string;
  label: string;
  /** Visual variant — drives the color the node renders with. */
  variant?: 'default' | 'accent' | 'coral' | 'muted' | 'db' | 'group';
  /** Optional sub-label rendered below in lighter weight. */
  sub?: string;
  width?: number;
  height?: number;
};

export type FlowEdge = {
  id?: string;
  source: string;
  target: string;
  label?: string;
  dashed?: boolean;
};

type FlowDiagramProps = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  /** Height in pixels (or any valid CSS height). Defaults to 480. */
  height?: number | string;
};

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 70;

const palette: Record<NonNullable<FlowNode['variant']>, { bg: string; border: string; fg: string }> = {
  default: { bg: '#2B2A28', border: '#4F4D48', fg: '#F5F2EC' },
  accent: { bg: '#3835A8', border: '#8884E5', fg: '#F5F2EC' },
  coral: { bg: '#FF6B5B', border: '#E84D3C', fg: '#1B1A19' },
  muted: { bg: '#1B1A19', border: '#4F4D48', fg: '#B7B4AD' },
  db: { bg: '#1E1B4B', border: '#5853CF', fg: '#E5E4F8' },
  group: { bg: 'transparent', border: '#4F4D48', fg: '#B7B4AD' },
};

function layout(
  nodes: FlowNode[],
  edges: FlowEdge[],
  direction: 'TB' | 'LR' | 'BT' | 'RL',
): { rfNodes: Node[]; rfEdges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 70, marginx: 20, marginy: 20 });

  for (const n of nodes) {
    g.setNode(n.id, {
      width: n.width ?? DEFAULT_WIDTH,
      height: n.height ?? DEFAULT_HEIGHT,
    });
  }
  for (const e of edges) g.setEdge(e.source, e.target);

  dagre.layout(g);

  const isHorizontal = direction === 'LR' || direction === 'RL';

  const rfNodes: Node[] = nodes.map((n) => {
    const pos = g.node(n.id);
    const variant = n.variant ?? 'default';
    const colors = palette[variant];
    const w = n.width ?? DEFAULT_WIDTH;
    const h = n.height ?? DEFAULT_HEIGHT;
    return {
      id: n.id,
      position: { x: pos.x - w / 2, y: pos.y - h / 2 },
      data: { label: renderLabel(n) },
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      style: {
        background: colors.bg,
        color: colors.fg,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        width: w,
        height: h,
        fontSize: 12,
        lineHeight: '1.35',
        padding: '8px 12px',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: variant === 'group' ? 'none' : '0 2px 8px rgba(0,0,0,0.25)',
      },
    };
  });

  const rfEdges: Edge[] = edges.map((e, i) => ({
    id: e.id ?? `e-${i}-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: false,
    type: 'smoothstep',
    style: {
      stroke: '#B7B4AD',
      strokeWidth: 1.4,
      strokeDasharray: e.dashed ? '6 4' : undefined,
    },
    labelStyle: { fill: '#F5F2EC', fontSize: 11, fontWeight: 500 },
    labelBgStyle: { fill: '#1B1A19' },
    labelBgPadding: [4, 2],
    labelBgBorderRadius: 4,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#B7B4AD' },
  }));

  return { rfNodes, rfEdges };
}

function renderLabel(n: FlowNode) {
  if (!n.sub) return n.label;
  return (
    <div>
      <div style={{ fontWeight: 600 }}>{n.label}</div>
      <div style={{ fontSize: 10.5, opacity: 0.75, marginTop: 2 }}>{n.sub}</div>
    </div>
  );
}

export default function FlowDiagram({
  nodes,
  edges,
  direction = 'TB',
  height = 480,
}: FlowDiagramProps) {
  const { rfNodes, rfEdges } = useMemo(
    () => layout(nodes, edges, direction),
    [nodes, edges, direction],
  );

  return (
    <div
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: '100%',
        border: '1px solid #2B2A28',
        borderRadius: 12,
        background: '#131211',
        margin: '1.5rem 0',
      }}
    >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        panOnScrollSpeed={0.7}
        minZoom={0.2}
        maxZoom={3}
      >
        <Background color="#2B2A28" gap={20} size={1} />
        <Controls showInteractive={false} style={{ background: '#1B1A19', border: '1px solid #2B2A28' }} />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(19,18,17,0.7)"
          style={{ background: '#1B1A19', border: '1px solid #2B2A28' }}
          nodeColor={(n) => (n.style?.background as string) ?? '#2B2A28'}
          nodeStrokeColor="#4F4D48"
        />
      </ReactFlow>
    </div>
  );
}
