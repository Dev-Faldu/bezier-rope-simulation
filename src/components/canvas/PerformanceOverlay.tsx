import React, { useState, useEffect, useRef } from 'react';
import { Activity, Clock, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceOverlayProps {
  isConnected: boolean;
  lastSyncTime?: number;
  className?: string;
}

interface PerformanceStats {
  fps: number;
  frameTime: number;
  latency: number;
}

export const PerformanceOverlay: React.FC<PerformanceOverlayProps> = ({
  isConnected,
  lastSyncTime,
  className,
}) => {
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 60,
    frameTime: 16.67,
    latency: 0,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const lastFpsUpdateRef = useRef(performance.now());
  const animationFrameRef = useRef<number | null>(null);
  const frameTimesRef = useRef<number[]>([]);

  useEffect(() => {
    const measureFrame = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      frameCountRef.current++;

      if (now - lastFpsUpdateRef.current >= 100) {
        const elapsed = now - lastFpsUpdateRef.current;
        const currentFps = Math.round((frameCountRef.current / elapsed) * 1000);
        const avgFrameTime =
          frameTimesRef.current.reduce((a, b) => a + b, 0) /
          frameTimesRef.current.length;

        setStats((prev) => ({
          fps: Math.min(currentFps, 144),
          frameTime: parseFloat(avgFrameTime.toFixed(2)),
          latency: lastSyncTime ? Date.now() - lastSyncTime : prev.latency,
        }));

        frameCountRef.current = 0;
        lastFpsUpdateRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(measureFrame);
    };

    animationFrameRef.current = requestAnimationFrame(measureFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [lastSyncTime]);

  const getFpsColor = (fps: number): string => {
    if (fps >= 55) return 'text-green-500';
    if (fps >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getLatencyColor = (latency: number): string => {
    if (latency < 50) return 'text-green-500';
    if (latency < 150) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div
      className={cn(
        'toolbar absolute left-4 bottom-4 z-10 cursor-pointer select-none',
        'rounded-lg px-3 py-2 text-xs font-mono transition-all duration-200',
        className
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Gauge className={cn('h-3.5 w-3.5', getFpsColor(stats.fps))} />
          <span className={getFpsColor(stats.fps)}>{stats.fps} FPS</span>
        </div>

        {isExpanded && (
          <>
            <div className="h-3 w-px bg-border" />

            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {stats.frameTime.toFixed(1)}ms
              </span>
            </div>

            <div className="h-3 w-px bg-border" />

            <div className="flex items-center gap-1.5">
              <Clock
                className={cn(
                  'h-3.5 w-3.5',
                  isConnected ? getLatencyColor(stats.latency) : 'text-destructive'
                )}
              />
              <span
                className={
                  isConnected ? getLatencyColor(stats.latency) : 'text-destructive'
                }
              >
                {isConnected ? `${stats.latency}ms` : 'offline'}
              </span>
            </div>
          </>
        )}
      </div>

      {!isExpanded && (
        <span className="text-muted-foreground/50 text-[10px] ml-2">
          click for more
        </span>
      )}
    </div>
  );
};
