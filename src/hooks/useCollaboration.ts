import { useState, useEffect, useCallback, useRef } from 'react';
import { SyncService } from '@/lib/sync-service';
import type { 
  UserPresence, 
  StrokeOperation, 
  DrawingOperation,
  Point,
} from '@/types/canvas';
import { USER_COLORS } from '@/types/canvas';
import { now } from '@/lib/canvas-engine';

interface UseCollaborationOptions {
  roomId: string;
  userId: string;
  userName: string;
  onRemoteOperation?: (op: DrawingOperation) => void;
  onOperationDeleted?: (id: string) => void;
  onStateSync?: (operations: DrawingOperation[]) => void;
}

interface UseCollaborationReturn {
  users: UserPresence[];
  isConnected: boolean;
  commitStroke: (stroke: StrokeOperation) => Promise<void>;
  commitClear: () => Promise<void>;
  undoLast: () => Promise<string | null>;
  redoLast: () => Promise<DrawingOperation | null>;
  updateCursor: (position: Point | null, isDrawing?: boolean) => void;
  localUser: UserPresence | null;
  lastSyncTime: number;
}

export function useCollaboration(options: UseCollaborationOptions): UseCollaborationReturn {
  const { 
    roomId, 
    userId, 
    userName, 
    onRemoteOperation, 
    onOperationDeleted,
    onStateSync,
  } = options;

  const [users, setUsers] = useState<UserPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [localUser, setLocalUser] = useState<UserPresence | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  
  const syncServiceRef = useRef<SyncService | null>(null);
  const cursorThrottleRef = useRef<NodeJS.Timeout | null>(null);

  const userColor = USER_COLORS[
    Math.abs(userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % USER_COLORS.length
  ];

  useEffect(() => {
    const syncService = new SyncService(userId, userName, userColor, roomId);
    syncServiceRef.current = syncService;

    syncService.setOnOperationReceived((op) => {
      setLastSyncTime(Date.now());
      onRemoteOperation?.(op);
    });

    syncService.setOnOperationDeleted((id) => {
      setLastSyncTime(Date.now());
      onOperationDeleted?.(id);
    });

    syncService.setOnPresenceChanged((presenceUsers) => {
      setUsers(presenceUsers);
    });

    syncService.connect()
      .then((operations) => {
        setIsConnected(true);
        onStateSync?.(operations);
      })
      .catch(() => {
        setIsConnected(false);
      });

    setLocalUser({
      id: userId,
      name: userName,
      color: userColor,
      cursor: null,
      isDrawing: false,
      lastSeen: now(),
    });

    return () => {
      syncService.disconnect();
      syncServiceRef.current = null;
    };
  }, [userId, userName, userColor, roomId]);

  const commitStroke = useCallback(async (stroke: StrokeOperation) => {
    const syncService = syncServiceRef.current;
    if (!syncService) return;

    await syncService.commitStroke(stroke);
  }, []);

  const commitClear = useCallback(async () => {
    const syncService = syncServiceRef.current;
    if (!syncService) return;

    await syncService.commitClear();
  }, []);

  const undoLast = useCallback(async (): Promise<string | null> => {
    const syncService = syncServiceRef.current;
    if (!syncService) return null;

    const result = await syncService.undoLast();
    if (result) setLastSyncTime(Date.now());
    return result;
  }, []);

  const redoLast = useCallback(async (): Promise<DrawingOperation | null> => {
    const syncService = syncServiceRef.current;
    if (!syncService) return null;

    const result = await syncService.redoLast();
    if (result) setLastSyncTime(Date.now());
    return result;
  }, []);

  const updateCursor = useCallback((position: Point | null, isDrawing: boolean = false) => {
    const syncService = syncServiceRef.current;
    if (!syncService) return;

    if (cursorThrottleRef.current) {
      clearTimeout(cursorThrottleRef.current);
    }

    cursorThrottleRef.current = setTimeout(() => {
      syncService.updateCursor(position, isDrawing);
    }, 50);
  }, []);

  return {
    users,
    isConnected,
    commitStroke,
    commitClear,
    undoLast,
    redoLast,
    updateCursor,
    localUser,
    lastSyncTime,
  };
}
