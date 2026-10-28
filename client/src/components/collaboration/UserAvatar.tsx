// ============================================================================
// UserAvatar.tsx — Color-coded user avatar badge
// ============================================================================

import React from 'react';

interface UserAvatarProps {
  username: string;
  color: string;
  isCurrentUser?: boolean;
  size?: 'sm' | 'md';
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  username,
  color,
  isCurrentUser = false,
  size = 'sm',
}) => {
  const initial = username.charAt(0).toUpperCase();
  const sizeClasses = size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-9 h-9 text-sm';

  return (
    <div
      className={`relative ${sizeClasses} rounded-full flex items-center justify-center font-bold text-white shadow-lg transition-transform hover:scale-110 cursor-default`}
      style={{
        backgroundColor: color,
        boxShadow: `0 0 0 2px ${isCurrentUser ? '#0a0e1a' : 'transparent'}, 0 0 0 ${isCurrentUser ? '3px' : '0'} ${color}`,
      }}
      title={`${username}${isCurrentUser ? ' (you)' : ''}`}
    >
      {initial}
      {/* Online dot */}
      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-electric-green border-2 border-dark-800" />
    </div>
  );
};

export default UserAvatar;
