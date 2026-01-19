import React from 'react';
import { Users } from 'lucide-react';
import type { UserPresence } from '@/types/canvas';
import { cn } from '@/lib/utils';

interface UserListProps {
  users: UserPresence[];
  localUserId: string;
}

export const UserList: React.FC<UserListProps> = ({ users, localUserId }) => {
  return (
    <div className="toolbar absolute right-4 top-4 flex items-center gap-3 px-4 py-2 rounded-xl animate-fade-in z-10">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Users className="h-4 w-4" />
        <span className="text-sm font-medium">{users.length}</span>
      </div>
      
      <div className="h-4 w-px bg-border" />
      
      <div className="flex items-center -space-x-2">
        {users.slice(0, 5).map((user) => (
          <div
            key={user.id}
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 border-card",
              user.id === localUserId && "ring-2 ring-primary ring-offset-1 ring-offset-card"
            )}
            style={{ backgroundColor: user.color, color: 'white' }}
            title={user.name + (user.id === localUserId ? ' (you)' : '')}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        ))}
        
        {users.length > 5 && (
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground border-2 border-card">
            +{users.length - 5}
          </div>
        )}
      </div>
    </div>
  );
};
