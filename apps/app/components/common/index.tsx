// components/common/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

// Client-side only icon wrapper to prevent hydration issues
export const ClientOnlyIcon = ({ children }: { children: React.ReactNode }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="w-5 h-5" />; // Placeholder with same dimensions
  }

  return <>{children}</>;
};

// Loading component
export const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex items-center justify-center">
      <ClientOnlyIcon>
        <Loader2 className={`${sizeClasses[size]} animate-spin text-yellow-500`} />
      </ClientOnlyIcon>
    </div>
  );
};

// Error component
export const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry?: () => void }) => (
  <div className="text-center p-8">
    <ClientOnlyIcon>
      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
    </ClientOnlyIcon>
    <div className="text-red-500 mb-2">Error</div>
    <div className="text-zinc-400 text-sm mb-4">{error}</div>
    {onRetry && (
      <button 
        onClick={onRetry}
        className="text-yellow-500 hover:text-yellow-400 text-sm flex items-center gap-2 mx-auto transition-colors"
      >
        <ClientOnlyIcon>
          <RefreshCw className="w-4 h-4" />
        </ClientOnlyIcon> Retry
      </button>
    )}
  </div>
);

// Fixed Animated Counter Component with cleanup
export const AnimatedCounter = ({ value, duration = 2000 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  const countRef = useRef<number>(0);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentCount = Math.floor(progress * value);
      
      if (currentCount !== countRef.current) {
        countRef.current = currentCount;
        setCount(currentCount);
      }
      
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    
    frameRef.current = requestAnimationFrame(animate);

    // Cleanup function
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, duration]);

  return <span>{count}</span>;
};

// Custom ScrollArea Component (styles already in globals.css)
export const ScrollArea = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`overflow-auto custom-scrollbar ${className || ''}`}>
    {children}
  </div>
);

// Format time function
export const formatTime = (date: Date) => {
  return date.toTimeString().slice(0, 5);
};

// Format delay from milliseconds to human readable
export const formatDelay = (ms: number): string => {
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h`;
  return `${Math.floor(ms / 86400000)}d`;
};

// Parse human readable delay to milliseconds
export const parseDelay = (str: string): number => {
  const num = parseInt(str);
  const unit = str.slice(-1).toLowerCase();
  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60000;
    case 'h': return num * 3600000;
    case 'd': return num * 86400000;
    default: return parseInt(str) || 0;
  }
};
