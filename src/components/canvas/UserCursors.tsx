import React from 'react';
import type { UserPresence } from '@/types/canvas';
import { cn } from '@/lib/utils';

interface UserCursorsProps {
  users: UserPresence[];
  localUserId: string;
}

export const UserCursors: React.FC<UserCursorsProps> = ({ users, localUserId }) => {
  const remoteCursors = users.filter(u => u.id !== localUserId && u.cursor !== null);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {remoteCursors.map((user) => (
        <div
          key={user.id}
          className="user-cursor"
          style={{
            left: user.cursor!.x,
            top: user.cursor!.y,
            color: user.color,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="absolute -translate-x-1 -translate-y-1"
          >
            <path
              d="M4 4L11 21L13 13L21 11L4 4Z"
              fill={user.color}
              stroke="white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          
          <div
            className="absolute left-5 top-4 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
            style={{ 
              backgroundColor: user.color,
              color: 'white',
            }}
          >
            {user.name}
          </div>

          {user.isDrawing && (
            <div 
              className="absolute w-3 h-3 rounded-full animate-cursor-pulse"
              style={{ 
                backgroundColor: user.color,
                left: -6,
                top: -6,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};
