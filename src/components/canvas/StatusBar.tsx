import React from 'react';
import { Wifi, WifiOff, Layers } from 'lucide-react';

interface StatusBarProps {
  isConnected: boolean;
  operationCount: number;
  roomId: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  isConnected,
  operationCount,
  roomId,
}) => {
  return (
    <div className="toolbar absolute left-1/2 -translate-x-1/2 bottom-4 flex items-center gap-4 px-4 py-2 rounded-xl animate-fade-in z-10">
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-destructive" />
            <span className="text-xs text-destructive">Disconnected</span>
          </>
        )}
      </div>

      <div className="h-4 w-px bg-border" />

      <div className="text-xs text-muted-foreground">
        Room: <span className="font-mono text-foreground">{roomId}</span>
      </div>

      <div className="h-4 w-px bg-border" />

      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {operationCount} {operationCount === 1 ? 'stroke' : 'strokes'}
        </span>
      </div>
    </div>
  );
};
