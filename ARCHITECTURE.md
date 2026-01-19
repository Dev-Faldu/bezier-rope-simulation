# Architecture Documentation

## Overview

This collaborative canvas follows a **command-sourcing** architecture where every drawing action is captured as an immutable operation. The canvas state is derived by replaying all operations in sequence order.

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT                                     │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │   useCanvas  │───▶│ CanvasEngine │───▶│  <canvas> Element    │  │
│  │    (Hook)    │    │   (Class)    │    │  (Raw 2D Context)    │  │
│  └──────┬───────┘    └──────────────┘    └──────────────────────┘  │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────┐                                                   │
│  │ useCollab    │──────────────────────────────────────────────────│
│  │   (Hook)     │        Supabase Realtime Channel                 │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SUPABASE (CLOUD)                                │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │   Realtime   │    │   Database   │    │     Edge Functions   │  │
│  │   Channels   │    │  (Postgres)  │    │    (Optional API)    │  │
│  └──────────────┘    └──────────────┘    └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Drawing Flow

```
User Input ──▶ useCanvas Hook ──▶ Local State ──▶ CanvasEngine ──▶ Render
     │                                  │
     │                                  ▼
     │                          broadcastStroke()
     │                                  │
     └──────────── Other Clients ◀──────┘
```

1. User moves mouse/touch while pressing
2. `useCanvas` captures points, applies filtering
3. Local state updates optimistically
4. `CanvasEngine` re-renders on next animation frame
5. Points batched and broadcast to other clients
6. Remote clients receive and add operation to their state

### State Synchronization

```
Local Operation ──▶ Broadcast ──▶ Server ──▶ All Clients
                                     │
                                     ▼
                              Sequence Ordering
                                     │
                                     ▼
                              Deterministic Replay
```

## WebSocket Message Protocol

All messages follow this structure:

```typescript
interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  userId: string;
  timestamp: number;
  sequence?: number;  // Server-assigned for ordering
}
```

### Message Types

| Type | Direction | Payload | Description |
|------|-----------|---------|-------------|
| `stroke:start` | Client → Server | `StrokeOperation` (partial) | New stroke begins |
| `stroke:move` | Client → Server | `{ strokeId, points[] }` | Points added to stroke |
| `stroke:end` | Client → Server | `StrokeOperation` (complete) | Stroke finished |
| `cursor:move` | Client → Server | `Point \| null` | Cursor position update |
| `operation:commit` | Server → Clients | `DrawingOperation` | Final operation with sequence |
| `operation:undo` | Bidirectional | `{ operationId }` | Undo request/notification |
| `operation:redo` | Bidirectional | `{ operationId }` | Redo request/notification |
| `state:sync` | Server → Client | `DrawingOperation[]` | Full state for late joiners |
| `user:join` | Server → Clients | `UserPresence` | User joined room |
| `user:leave` | Server → Clients | `{ userId }` | User left room |
| `canvas:clear` | Bidirectional | `{}` | Clear canvas request |

## Undo/Redo Algorithm

### Global Operation Stack

Unlike per-user undo, we maintain a **single global operation stack**:

```
Operations: [A₁, B₁, A₂, B₂, A₃]
            (User A and B interleaved)

Undo removes the LAST operation regardless of who created it.
```

### State Reconstruction

```typescript
function reconstructCanvas(operations: Operation[]): void {
  // Clear canvas
  clearCanvas();
  
  // Replay all operations in sequence order
  for (const op of operations.sort((a, b) => a.sequence - b.sequence)) {
    if (op.type === 'stroke') {
      drawStroke(op);
    } else if (op.type === 'clear') {
      clearCanvas();
    }
  }
}
```

### Conflict Scenarios

1. **User A undoes while User B is drawing**
   - B's in-progress stroke continues unaffected
   - Only completed operations in the stack can be undone
   - B's stroke commits after undo is processed

2. **Simultaneous undos from A and B**
   - Server assigns sequence numbers
   - Both undos apply in order received
   - Last two operations removed

3. **Undo then immediate redo**
   - Undone operation moves to redo stack
   - Redo restores it with same sequence
   - Other users see undo then redo

## Rendering Strategy

### Full Canvas Redraw (Chosen Approach)

**Why not dirty rectangles?**

1. **Eraser complexity** - Eraser needs to know what's underneath. Dirty rectangles would require per-pixel tracking.
2. **Z-order changes** - Undo can remove strokes from the middle of the stack.
3. **Simplicity** - Full redraw is easier to verify correct.
4. **Performance** - Modern GPUs handle full canvas blits efficiently at 60fps.

**Optimization: Double Buffering**

```typescript
// Render to offscreen canvas
offscreenCtx.fillRect(0, 0, width, height);
for (const op of operations) {
  drawStroke(offscreenCtx, op);
}

// Blit to visible canvas (single
 
operation)
ctx.drawImage(offscreenCanvas, 0, 0);
```

### Path Smoothing

Using **Catmull-Rom splines** for smooth curves:

```
Raw points:    •    •    •    •
               
Smoothed:      ~~~~~~~•~~~~~~~•~~~~~~~
```

Catmull-Rom guarantees the curve passes through all control points, unlike Bezier which only approximates.

## Performance Considerations

### Point Filtering

Raw input at 60hz = too many points. We filter:

```typescript
// Only keep points > minDistance apart
const minDistance = strokeWidth / 4;
if (distance(lastPoint, newPoint) < minDistance) {
  skip();
}
```

### Network Batching

Points sent every N points or every M milliseconds:

```typescript
if (pointBuffer.length % 3 === 0) {
  broadcastPoints(pointBuffer);
}
```

### Throttled Cursor Updates

Cursor positions throttled to 20hz to reduce network traffic:

```typescript
const throttledBroadcast = throttle(broadcastCursor, 50);
```

## Scaling Considerations

### 1,000 Users Scenario

**Challenges:**
- 1000 simultaneous cursor updates = 20,000 messages/second
- Large operation history = slow state sync
- Memory per canvas instance

**Solutions:**

1. **Presence Sampling** - Only show N nearest cursors
2. **Operation Compaction** - Merge old strokes into single image layer
3. **Viewport Culling** - Don't sync strokes outside visible area
4. **Regional Sharding** - Split large canvases into zones
5. **Read Replicas** - Fan-out via Supabase Edge Network

### Database Schema (Production)

```sql
-- Rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operations table (append-only log)
CREATE TABLE operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  user_id UUID NOT NULL,
  sequence BIGSERIAL,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for room queries
CREATE INDEX idx_operations_room ON operations(room_id, sequence);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE operations;
```

## Security Considerations

1. **Rate Limiting** - Max operations per user per second
2. **Payload Validation** - Sanitize point data, prevent oversized strokes
3. **Room Authorization** - Verify user has access to room
4. **Operation Signing** - Prevent spoofed user IDs
5. **Size Limits** - Max canvas dimensions, max stroke points

## Testing Strategy

### Unit Tests
- Point interpolation accuracy
- Filter algorithm correctness
- Sequence ordering

### Integration Tests
- State sync on join
- Undo/redo consistency
- Reconnection handling

### Load Tests
- 100 concurrent users drawing
- 10,000 operations per room
- Network latency simulation

---

*This architecture prioritizes correctness and simplicity over raw performance. For a production system with thousands of users, consider CRDTs (like Automerge or Yjs) for conflict-free replication.*
