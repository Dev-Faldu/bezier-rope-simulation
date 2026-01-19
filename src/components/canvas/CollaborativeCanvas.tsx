import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useCanvas } from '@/hooks/useCanvas';
import { useCollaboration } from '@/hooks/useCollaboration';
import { Toolbar } from './Toolbar';
import { UserCursors } from './UserCursors';
import { UserList } from './UserList';
import { StatusBar } from './StatusBar';
import { PerformanceOverlay } from './PerformanceOverlay';
import { RoomSelector, roomIdToUUID, uuidToRoomId } from './RoomSelector';
import type { ToolSettings } from '@/types/canvas';
import { generateId } from '@/lib/canvas-engine';
import { toast } from 'sonner';

const getOrCreateUserId = () => {
  const stored = sessionStorage.getItem('canvas-user-id');
  if (stored) return stored;
  const newId = generateId();
  sessionStorage.setItem('canvas-user-id', newId);
  return newId;
};

const getOrCreateUserName = () => {
  const stored = sessionStorage.getItem('canvas-user-name');
  if (stored) return stored;
  const newName = `Artist ${Math.floor(Math.random() * 9999)}`;
  sessionStorage.setItem('canvas-user-name', newName);
  return newName;
};

const getInitialRoomId = (): string => {
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get('room');
  if (roomParam && roomParam.length >= 4) {
    return roomIdToUUID(roomParam);
  }
  return '00000000-0000-0000-0000-000000000001';
};

const USER_ID = getOrCreateUserId();
const USER_NAME = getOrCreateUserName();

export const CollaborativeCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [roomId, setRoomId] = useState(getInitialRoomId);
  const [canRedo, setCanRedo] = useState(false);
  
  const [toolSettings, setToolSettings] = useState<ToolSettings>({
    tool: 'brush',
    color: '#1a1a2e',
    width: 4,
  });

  const canvas = useCanvas(toolSettings, {
    userId: USER_ID,
    onStrokeComplete: async (stroke) => {
      await collaboration.commitStroke(stroke);
      setCanRedo(false);
    },
  });

  const collaboration = useCollaboration({
    roomId,
    userId: USER_ID,
    userName: USER_NAME,
    onRemoteOperation: (op) => {
      canvas.addOperation(op);
    },
    onOperationDeleted: (id) => {
      canvas.removeOperation(id);
    },
    onStateSync: (operations) => {
      canvas.setOperations(operations);
      setIsInitialized(true);
    },
  });

  const handleRoomChange = useCallback((newRoomId: string) => {
    const shortId = uuidToRoomId(newRoomId);
    const url = new URL(window.location.href);
    url.searchParams.set('room', shortId);
    window.history.pushState({}, '', url.toString());
    
    setIsInitialized(false);
    canvas.clear();
    setRoomId(newRoomId);
    setCanRedo(false);
  }, [canvas]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        canvas.resize(clientWidth, clientHeight);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvas]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      collaboration.updateCursor(
        {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          timestamp: Date.now(),
        },
        canvas.isDrawing
      );
    }
  }, [canvas.isDrawing, collaboration]);

  const handleMouseLeave = useCallback(() => {
    collaboration.updateCursor(null);
  }, [collaboration]);

  const updateSettings = useCallback((updates: Partial<ToolSettings>) => {
    setToolSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const handleUndo = useCallback(async () => {
    const undoneId = await collaboration.undoLast();
    if (undoneId) {
      canvas.removeOperation(undoneId);
      setCanRedo(true);
      toast('Undone', { description: 'Last action reverted globally' });
    } else {
      toast('Nothing to undo');
    }
  }, [collaboration, canvas]);

  const handleRedo = useCallback(async () => {
    const redoneOp = await collaboration.redoLast();
    if (redoneOp) {
      canvas.addOperation(redoneOp);
      toast('Redone', { description: 'Action restored globally' });
    } else {
      setCanRedo(false);
      toast('Nothing to redo');
    }
  }, [collaboration, canvas]);

  const handleClear = useCallback(async () => {
    canvas.clear();
    await collaboration.commitClear();
    setCanRedo(false);
    toast('Canvas cleared', { description: 'All strokes removed globally' });
  }, [canvas, collaboration]);

  const handleExport = useCallback(() => {
    const engine = canvas.getEngine();
    if (!engine) return;

    const dataUrl = engine.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `canvas-${uuidToRoomId(roomId)}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    
    toast.success('Exported', { description: 'Canvas saved as PNG' });
  }, [canvas, roomId]);

  const getCursorStyle = (): React.CSSProperties => {
    return { cursor: 'crosshair' };
  };

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden">
      {!isInitialized && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Connecting to canvas...</p>
          </div>
        </div>
      )}

      <div 
        ref={containerRef}
        className="absolute inset-4 canvas-container rounded-2xl overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <canvas
          ref={canvas.canvasRef}
          className="touch-none"
          style={getCursorStyle()}
          onMouseDown={canvas.startDrawing}
          onMouseMove={(e) => {
            canvas.continueDrawing(e);
            handleMouseMove(e);
          }}
          onMouseUp={canvas.endDrawing}
          onMouseLeave={canvas.endDrawing}
          onTouchStart={canvas.startDrawing}
          onTouchMove={canvas.continueDrawing}
          onTouchEnd={canvas.endDrawing}
        />

        <UserCursors 
          users={collaboration.users} 
          localUserId={USER_ID} 
        />
      </div>

      <Toolbar
        settings={toolSettings}
        onSettingsChange={updateSettings}
        canUndo={canvas.operationCount > 0}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onExport={handleExport}
      />

      <div className="absolute top-4 left-4 z-10">
        <RoomSelector
          currentRoomId={roomId}
          onRoomChange={handleRoomChange}
          userCount={collaboration.users.length + 1}
        />
      </div>

      <UserList 
        users={collaboration.users} 
        localUserId={USER_ID} 
      />

      <PerformanceOverlay
        isConnected={collaboration.isConnected}
        lastSyncTime={collaboration.lastSyncTime}
      />

      <StatusBar
        isConnected={collaboration.isConnected}
        operationCount={canvas.operationCount}
        roomId={uuidToRoomId(roomId)}
      />
    </div>
  );
};
