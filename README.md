# Real-Time Collaborative Drawing Canvas

A production-grade, multi-user collaborative drawing canvas built with raw HTML5 Canvas API and React. No drawing libraries - pure canvas manipulation with real-time synchronization.

## Features

- Raw Canvas API - No external drawing libraries
- Real-time collaboration with live stroke sync
- Remote cursor indicators
- Global undo/redo across all users
- Room system with isolated canvases
- Touch support
- FPS/latency performance overlay
- Export as PNG

## Quick Start

Open the app in multiple browser tabs to test multi-user collaboration.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| B | Brush tool |
| E | Eraser tool |
| [ | Decrease brush size |
| ] | Increase brush size |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |

## Project Structure

```
src/
├── components/canvas/
│   ├── CollaborativeCanvas.tsx
│   ├── Toolbar.tsx
│   ├── UserCursors.tsx
│   ├── UserList.tsx
│   ├── StatusBar.tsx
│   ├── PerformanceOverlay.tsx
│   └── RoomSelector.tsx
├── hooks/
│   ├── useCanvas.ts
│   └── useCollaboration.ts
├── lib/
│   ├── canvas-engine.ts
│   └── sync-service.ts
├── types/
│   └── canvas.ts
└── pages/
    └── Index.tsx
```

## Technical Implementation

- Double buffering for flicker-free rendering
- Catmull-Rom spline interpolation for smooth curves
- Point filtering to reduce network traffic
- Server-sequenced operations for deterministic ordering
- Presence channel for cursor positions

## Known Limitations

- No user authentication
- Uses simple operation ordering (not CRDT)
- RLS policies are public (intended for anonymous collaboration)

## Architecture

See ARCHITECTURE.md for detailed technical documentation.
