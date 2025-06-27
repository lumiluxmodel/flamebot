// components/edges/WorkflowEdges.tsx
import React from 'react';
import { EdgeProps } from '@xyflow/react';

// Loop Edge with custom styling
export const LoopEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
}) => {
  // Custom path for loop edges that curves more dramatically
  const radiusX = Math.abs(targetX - sourceX) * 0.6;
  
  // Create a more pronounced curve for loop visualization
  const path = `
    M ${sourceX},${sourceY}
    C ${sourceX - radiusX},${sourceY} 
      ${targetX - radiusX},${targetY} 
      ${targetX},${targetY}
  `;

  return (
    <>
      <defs>
        <marker
          id={`loop-arrow-${id}`}
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            fill="#ef4444"
            stroke="#ef4444"
          />
        </marker>
      </defs>
      <path
        id={id}
        style={{
          stroke: '#ef4444',
          strokeWidth: 2,
          fill: 'none',
          strokeDasharray: '5,5',
        }}
        className="react-flow__edge-path animate-pulse"
        d={path}
        markerEnd={`url(#loop-arrow-${id})`}
      />
      <path
        d={path}
        style={{
          strokeWidth: 20,
          fill: 'none',
          stroke: 'transparent',
        }}
        className="react-flow__edge-interaction"
      />
    </>
  );
};

// Export edge types
export const edgeTypes = {
  loop: LoopEdge,
};
