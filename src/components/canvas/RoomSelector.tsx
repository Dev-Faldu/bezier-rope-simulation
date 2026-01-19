import React, { useState, useCallback } from 'react';
import { Plus, Hash, Copy, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface RoomSelectorProps {
  currentRoomId: string;
  onRoomChange: (roomId: string) => void;
  userCount: number;
}

function generateRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function roomIdToUUID(shortId: string): string {
  const padded = shortId.padEnd(32, '0');
  return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20, 32)}`;
}

export function uuidToRoomId(uuid: string): string {
  return uuid.replace(/-/g, '').slice(0, 8);
}

export const RoomSelector: React.FC<RoomSelectorProps> = ({
  currentRoomId,
  onRoomChange,
  userCount,
}) => {
  const [joinRoomId, setJoinRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const shortRoomId = uuidToRoomId(currentRoomId);

  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}?room=${shortRoomId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Room link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  }, [shortRoomId]);

  const handleCreateRoom = useCallback(() => {
    const newRoomId = generateRoomId();
    const uuid = roomIdToUUID(newRoomId);
    onRoomChange(uuid);
    setIsOpen(false);
    toast.success('New room created', {
      description: `Room ID: ${newRoomId}`,
    });
  }, [onRoomChange]);

  const handleJoinRoom = useCallback(() => {
    const cleanId = joinRoomId.trim().toLowerCase();
    if (cleanId.length < 4) {
      toast.error('Room ID too short', {
        description: 'Please enter at least 4 characters',
      });
      return;
    }
    const uuid = roomIdToUUID(cleanId);
    onRoomChange(uuid);
    setJoinRoomId('');
    setIsOpen(false);
    toast.success('Joined room', {
      description: `Room ID: ${cleanId}`,
    });
  }, [joinRoomId, onRoomChange]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="toolbar gap-2 px-3 py-2 h-auto"
        >
          <Hash className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm">{shortRoomId}</span>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="text-xs">{userCount}</span>
          </div>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            Room Management
          </DialogTitle>
          <DialogDescription>
            Create a new room or join an existing one. Each room has an isolated canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Room</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm">{shortRoomId}</span>
                <span className="text-xs text-muted-foreground">
                  ({userCount} {userCount === 1 ? 'user' : 'users'} online)
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Create New Room</label>
            <Button
              onClick={handleCreateRoom}
              className="w-full gap-2"
              variant="secondary"
            >
              <Plus className="h-4 w-4" />
              Create New Room
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Join Existing Room</label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter room ID..."
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                className="font-mono"
              />
              <Button
                onClick={handleJoinRoom}
                disabled={joinRoomId.trim().length < 4}
              >
                Join
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
