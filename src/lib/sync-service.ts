import { supabase } from '@/integrations/supabase/client';
import type { 
  DrawingOperation, 
  StrokeOperation,
  UserPresence,
  Point,
} from '@/types/canvas';
import { RealtimeChannel } from '@supabase/supabase-js';

const DEFAULT_ROOM_ID = '00000000-0000-0000-0000-000000000001';

function rowToOperation(row: any): DrawingOperation {
  if (row.type === 'stroke') {
    return {
      id: row.id,
      type: 'stroke',
      userId: row.user_id,
      color: row.data?.color || '#000000',
      width: row.data?.width || 4,
      tool: row.data?.tool || 'brush',
      points: row.data?.points || [],
      startTime: new Date(row.created_at).getTime(),
      sequence: Number(row.sequence),
    } as StrokeOperation;
  } else {
    return {
      id: row.id,
      type: 'clear',
      userId: row.user_id,
      timestamp: new Date(row.created_at).getTime(),
      sequence: Number(row.sequence),
    };
  }
}

export class SyncService {
  private roomId: string;
  private userId: string;
  private userName: string;
  private userColor: string;
  private operationsChannel: RealtimeChannel | null = null;
  private presenceChannel: RealtimeChannel | null = null;
  private onOperationReceived: ((op: DrawingOperation) => void) | null = null;
  private onOperationDeleted: ((id: string) => void) | null = null;
  private onPresenceChanged: ((users: UserPresence[]) => void) | null = null;
  private isConnected: boolean = false;

  constructor(
    userId: string,
    userName: string,
    userColor: string,
    roomId: string = DEFAULT_ROOM_ID
  ) {
    this.userId = userId;
    this.userName = userName;
    this.userColor = userColor;
    this.roomId = roomId;
  }

  setOnOperationReceived(callback: (op: DrawingOperation) => void) {
    this.onOperationReceived = callback;
  }

  setOnOperationDeleted(callback: (id: string) => void) {
    this.onOperationDeleted = callback;
  }

  setOnPresenceChanged(callback: (users: UserPresence[]) => void) {
    this.onPresenceChanged = callback;
  }

  async connect(): Promise<DrawingOperation[]> {
    const { data: existingOps, error: fetchError } = await supabase
      .from('operations')
      .select('*')
      .eq('room_id', this.roomId)
      .order('sequence', { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    const operations = (existingOps || []).map(rowToOperation);

    this.operationsChannel = supabase
      .channel(`room:${this.roomId}:operations`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'operations',
          filter: `room_id=eq.${this.roomId}`,
        },
        (payload) => {
          const op = rowToOperation(payload.new);
          if (op.userId !== this.userId) {
            this.onOperationReceived?.(op);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'operations',
          filter: `room_id=eq.${this.roomId}`,
        },
        (payload) => {
          const deletedId = (payload.old as any)?.id;
          if (deletedId) {
            this.onOperationDeleted?.(deletedId);
          }
        }
      )
      .subscribe((status) => {
        this.isConnected = status === 'SUBSCRIBED';
      });

    this.presenceChannel = supabase.channel(`room:${this.roomId}:presence`, {
      config: {
        presence: { key: this.userId },
      },
    });

    this.presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = this.presenceChannel?.presenceState() || {};
        const users: UserPresence[] = Object.values(state).flat().map((p: any) => ({
          id: p.userId,
          name: p.userName,
          color: p.userColor,
          cursor: p.cursor,
          isDrawing: p.isDrawing || false,
          lastSeen: p.lastSeen || Date.now(),
        }));
        this.onPresenceChanged?.(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.presenceChannel?.track({
            userId: this.userId,
            userName: this.userName,
            userColor: this.userColor,
            cursor: null,
            isDrawing: false,
            lastSeen: Date.now(),
          });
        }
      });

    return operations;
  }

  async disconnect() {
    if (this.operationsChannel) {
      await supabase.removeChannel(this.operationsChannel);
      this.operationsChannel = null;
    }
    if (this.presenceChannel) {
      await supabase.removeChannel(this.presenceChannel);
      this.presenceChannel = null;
    }
    this.isConnected = false;
  }

  async commitStroke(stroke: StrokeOperation): Promise<number | null> {
    await this.clearRedoStack();

    const strokeData = JSON.parse(JSON.stringify({
      id: stroke.id,
      color: stroke.color,
      width: stroke.width,
      tool: stroke.tool,
      points: stroke.points,
    }));

    const { data, error } = await supabase
      .from('operations')
      .insert({
        room_id: this.roomId,
        user_id: this.userId,
        user_name: this.userName,
        user_color: this.userColor,
        type: 'stroke',
        data: strokeData,
      })
      .select('id, sequence')
      .single();

    if (error) {
      return null;
    }

    return data?.sequence || null;
  }

  async commitClear(): Promise<void> {
    await supabase
      .from('operations')
      .delete()
      .eq('room_id', this.roomId);
  }

  async undoLast(): Promise<string | null> {
    const { data: lastOp, error: fetchError } = await supabase
      .from('operations')
      .select('*')
      .eq('room_id', this.roomId)
      .order('sequence', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !lastOp) {
      return null;
    }

    await supabase
      .from('redo_stack')
      .insert({
        room_id: this.roomId,
        original_id: lastOp.id,
        operation_data: JSON.parse(JSON.stringify(lastOp)),
      });

    const { error: deleteError } = await supabase
      .from('operations')
      .delete()
      .eq('id', lastOp.id);

    if (deleteError) {
      return null;
    }

    return lastOp.id;
  }

  async redoLast(): Promise<DrawingOperation | null> {
    const { data: redoItem, error: fetchError } = await supabase
      .from('redo_stack')
      .select('*')
      .eq('room_id', this.roomId)
      .order('deleted_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !redoItem) {
      return null;
    }

    const opData = redoItem.operation_data as any;

    const { data: newOp, error: insertError } = await supabase
      .from('operations')
      .insert({
        room_id: this.roomId,
        user_id: opData.user_id,
        user_name: opData.user_name,
        user_color: opData.user_color,
        type: opData.type,
        data: opData.data,
      })
      .select('*')
      .single();

    if (insertError || !newOp) {
      return null;
    }

    await supabase
      .from('redo_stack')
      .delete()
      .eq('id', redoItem.id);

    return rowToOperation(newOp);
  }

  async hasRedoAvailable(): Promise<boolean> {
    const { count } = await supabase
      .from('redo_stack')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', this.roomId);

    return (count || 0) > 0;
  }

  async clearRedoStack(): Promise<void> {
    await supabase
      .from('redo_stack')
      .delete()
      .eq('room_id', this.roomId);
  }

  async updateCursor(cursor: Point | null, isDrawing: boolean = false) {
    if (!this.presenceChannel) return;

    await this.presenceChannel.track({
      userId: this.userId,
      userName: this.userName,
      userColor: this.userColor,
      cursor,
      isDrawing,
      lastSeen: Date.now(),
    });
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  getRoomId(): string {
    return this.roomId;
  }
}
