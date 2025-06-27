// components/WorkflowEditor2.tsx
import React, { useCallback, useRef, useState, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  Panel,
  BackgroundVariant,
  Connection,
  Node,
  Edge,
  useReactFlow,
  NodeTypes,
  EdgeTypes,
  Position,
  MarkerType,
  NodeToolbar,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Download, Plus, Save, Trash2, Upload, Eye, EyeOff } from 'lucide-react';
import { ClientOnlyIcon } from './common';

// Import sidebar
import { WorkflowSidebar } from './WorkflowSidebar';

// Import serializers
import { workflowToReactFlow, reactFlowToWorkflow } from '../lib/workflow-serializer';

// Types
import type { WorkflowStep, Workflow } from '../lib/workflow-types';

// Import node and edge types directly
import { nodeTypes } from './nodes/WorkflowNodes';
import { edgeTypes } from './edges/WorkflowEdges';

// Helper to generate unique IDs
let idCounter = 0;
const getId = () => `node_${Date.now()}_${idCounter++}`;

// Main WorkflowEditor component
function WorkflowEditorFlow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition } = useReactFlow();
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Workflow metadata
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [workflowType, setWorkflowType] = useState('custom');
  const [workflowDescription, setWorkflowDescription] = useState('Visual workflow');

  // Connection validation
  const isValidConnection = useCallback((connection: Connection) => {
    // Prevent self-connections
    if (connection.source === connection.target) return false;

    // Special validation for loop connections
    if (connection.sourceHandle === 'loop') {
      const sourceNode = nodes.find(n => n.id === connection.source);
      const targetNode = nodes.find(n => n.id === connection.target);
      
      if (sourceNode && targetNode) {
        // Only allow loops to earlier nodes (backward connections)
        return targetNode.position.y < sourceNode.position.y;
      }
    }

    // Don't allow multiple connections from the same source
    const existingEdge = edges.find(
      e => e.source === connection.source && 
           e.sourceHandle === connection.sourceHandle
    );
    
    return !existingEdge;
  }, [nodes, edges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (isValidConnection(params)) {
        const newEdge: Edge = {
          ...params,
          id: `edge_${params.source}_${params.target}`,
          type: params.sourceHandle === 'loop' ? 'loop' : 'default',
          animated: params.sourceHandle === 'loop',
          style: {
            strokeWidth: 2,
            stroke: params.sourceHandle === 'loop' ? '#ff6b6b' : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
        };
        setEdges((eds) => addEdge(newEdge, eds));
      }
    },
    [setEdges, isValidConnection]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      
      if (!type || !reactFlowWrapper.current) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: getDefaultNodeData(type),
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Delete selected nodes/edges
  const onDeleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((node) => !node.selected));
    setEdges((eds) => eds.filter((edge) => !edge.selected));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  // Export workflow
  const exportWorkflow = useCallback(() => {
    const workflow = reactFlowToWorkflow(nodes, edges, {
      name: workflowName,
      type: workflowType,
      description: workflowDescription,
    });
    
    const dataStr = JSON.stringify(workflow, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `${workflowType}_${Date.now()}.json`);
    linkElement.click();
  }, [nodes, edges, workflowName, workflowType, workflowDescription]);

  // Import workflow
  const importWorkflow = useCallback((workflow: Workflow) => {
    const { nodes: newNodes, edges: newEdges } = workflowToReactFlow(workflow);
    setNodes(newNodes);
    setEdges(newEdges);
    setWorkflowName(workflow.name);
    setWorkflowType(workflow.type);
    setWorkflowDescription(workflow.description);
  }, [setNodes, setEdges]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workflow = JSON.parse(e.target?.result as string);
        importWorkflow(workflow);
      } catch (error) {
        alert('Invalid workflow file');
      }
    };
    reader.readAsText(file);
  }, [importWorkflow]);

  // Clear workflow
  const clearWorkflow = useCallback(() => {
    if (confirm('Are you sure you want to clear the workflow?')) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
    }
  }, [setNodes, setEdges]);

  // MiniMap node color
  const nodeColor = useCallback((node: Node) => {
    switch (node.type) {
      case 'start': return '#10b981';
      case 'wait': return '#6366f1';
      case 'add_prompt': return '#f59e0b';
      case 'add_bio': return '#ec4899';
      case 'swipe_with_spectre': return '#06b6d4';
      case 'activate_continuous_swipe': return '#8b5cf6';
      case 'goto': return '#ef4444';
      default: return '#71717a';
    }
  }, []);

  return (
    <div className="workflow-editor-v2 h-full flex bg-white dark:bg-black transition-colors">
      <WorkflowSidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Top toolbar */}
        <div className="border-b border-zinc-200 dark:border-zinc-900 p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="text-lg font-bold bg-transparent border-none outline-none text-zinc-900 dark:text-white focus:ring-2 focus:ring-yellow-500/50 px-2 py-1 rounded"
                placeholder="Workflow Name"
              />
              <input
                type="text"
                value={workflowType}
                onChange={(e) => setWorkflowType(e.target.value)}
                className="text-sm font-mono bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-1 rounded outline-none focus:border-yellow-500/50 transition-colors"
                placeholder="workflow_type"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-600 dark:text-zinc-400">GRID:</span>
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    title={showGrid ? 'Hide Grid' : 'Show Grid'}
                  >
                    <ClientOnlyIcon>
                      {showGrid ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </ClientOnlyIcon>
                  </button>
                </div>
                
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-600 dark:text-zinc-400">MINIMAP:</span>
                  <button
                    onClick={() => setShowMiniMap(!showMiniMap)}
                    className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    title={showMiniMap ? 'Hide MiniMap' : 'Show MiniMap'}
                  >
                    <ClientOnlyIcon>
                      {showMiniMap ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </ClientOnlyIcon>
                  </button>
                </div>
              </div>
              
              <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-2" />
              
              <label className="cursor-pointer p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                <ClientOnlyIcon>
                  <Upload className="w-4 h-4" />
                </ClientOnlyIcon>
                <span className="text-[10px] hidden lg:inline">IMPORT</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              
              <button
                onClick={exportWorkflow}
                className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2"
                title="Export Workflow"
              >
                <ClientOnlyIcon>
                  <Download className="w-4 h-4" />
                </ClientOnlyIcon>
                <span className="text-[10px] hidden lg:inline">EXPORT</span>
              </button>
              
              <button
                onClick={clearWorkflow}
                className="p-2 text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors flex items-center gap-2"
                title="Clear Workflow"
              >
                <ClientOnlyIcon>
                  <Trash2 className="w-4 h-4" />
                </ClientOnlyIcon>
                <span className="text-[10px] hidden lg:inline">CLEAR</span>
              </button>
            </div>
          </div>
          
          <div className="mt-2">
            <textarea
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
              className="w-full text-sm bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-2 rounded outline-none focus:border-yellow-500/50 transition-colors resize-none"
              placeholder="Workflow description..."
              rows={2}
            />
          </div>
        </div>
        
        {/* React Flow canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            isValidConnection={isValidConnection}
            deleteKeyCode={['Delete', 'Backspace']}
            onNodesDelete={onDeleteSelected}
            onEdgesDelete={onDeleteSelected}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={0.2}
            maxZoom={4}
            snapToGrid={true}
            snapGrid={[20, 20]}
            connectionLineStyle={{ stroke: '#f59e0b', strokeWidth: 2 }}
            className="bg-zinc-50 dark:bg-zinc-950"
          >
            <Controls 
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg"
              showInteractive={false}
            />
            
            {showMiniMap && (
              <MiniMap 
                nodeColor={nodeColor}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg"
                maskColor="rgb(50, 50, 50, 0.8)"
                pannable
                zoomable
              />
            )}
            
            {showGrid && (
              <Background 
                variant={BackgroundVariant.Dots} 
                gap={20} 
                size={1}
                color="#71717a20"
              />
            )}
            
            {/* Workflow stats panel */}
            <Panel position="bottom-left" className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 m-4 text-xs">
              <div className="space-y-1">
                <div className="text-zinc-600 dark:text-zinc-400">
                  Nodes: <span className="font-mono text-zinc-900 dark:text-white">{nodes.length}</span>
                </div>
                <div className="text-zinc-600 dark:text-zinc-400">
                  Connections: <span className="font-mono text-zinc-900 dark:text-white">{edges.length}</span>
                </div>
                <div className="text-zinc-600 dark:text-zinc-400">
                  Loops: <span className="font-mono text-zinc-900 dark:text-white">{edges.filter(e => e.type === 'loop').length}</span>
                </div>
              </div>
            </Panel>
            
            {/* Instructions panel */}
            <Panel position="top-center" className="text-[10px] text-zinc-600 dark:text-zinc-400 m-4">
              DRAG_AND_DROP_NODES • CONNECT_WITH_HANDLES • DELETE_WITH_BACKSPACE
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

// Main component with provider
export const WorkflowEditor2: React.FC = () => {
  return (
    <ReactFlowProvider>
      <WorkflowEditorFlow />
    </ReactFlowProvider>
  );
};

// Helper function for default node data
function getDefaultNodeData(type: string) {
  switch (type) {
    case 'start':
      return { label: 'Start', description: 'Workflow entry point' };
    case 'wait':
      return { label: 'Wait', delay: 60000, description: 'Wait for delay' };
    case 'goto':
      return { label: 'Go To', targetNodeId: '', loop: false, description: 'Jump to step' };
    case 'add_prompt':
      return { label: 'Add Prompt', critical: false, delay: 0, description: 'Add AI prompt' };
    case 'add_bio':
      return { label: 'Add Bio', delay: 0, description: 'Add bio' };
    case 'swipe_with_spectre':
      return { label: 'Swipe with Spectre', swipeCount: 10, delay: 0, description: 'Swipe action' };
    case 'activate_continuous_swipe':
      return { 
        label: 'Continuous Swipe', 
        minSwipes: 15, 
        maxSwipes: 25, 
        minIntervalMs: 3600000,
        maxIntervalMs: 7200000,
        delay: 0,
        description: 'Activate continuous swipes' 
      };
    default:
      return { label: type, description: 'Custom action' };
  }
}
