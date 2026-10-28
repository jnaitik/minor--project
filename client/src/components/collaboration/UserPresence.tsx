// ============================================================================
// UserPresence.tsx — Shows connected users and their presence status
// ============================================================================

import React from 'react';
import { useRoomStore } from '../../store/roomStore';
import UserAvatar from './UserAvatar';

const UserPresence: React.FC = () => {
  const connectedUsers = useRoomStore(s => s.connectedUsers);
  const userId = useRoomStore(s => s.userId);

  return (
    <div className="flex items-center gap-1">
      {connectedUsers.map(user => (
        <UserAvatar
          key={user.id}
          username={user.username}
          color={user.color}
          isCurrentUser={user.id === userId}
        />
      ))}
      {connectedUsers.length > 0 && (
        <span className="text-[10px] text-dark-400 ml-1">
          {connectedUsers.length} online
        </span>
      )}
    </div>
  );
};

export default UserPresence;
