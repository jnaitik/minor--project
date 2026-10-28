// ============================================================================
// RoomLobby.tsx — Landing page for creating/joining collaboration rooms
// Beautiful animated hero section with room management
// ============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Users, Hand, ArrowRight, Loader2, Cpu } from 'lucide-react';

const RoomLobby: React.FC = () => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }
    setIsCreating(true);
    setError('');

    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      const data = await res.json();
      // Store username in sessionStorage for the room page
      sessionStorage.setItem('cc_username', username.trim());
      navigate(`/room/${data.roomId}`);
    } catch (err) {
      setError('Failed to create room. Is the server running?');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    setIsJoining(true);
    setError('');

    try {
      const res = await fetch(`/api/rooms/${roomCode.trim().toUpperCase()}`);
      if (!res.ok) {
        setError('Room not found. Check the code and try again.');
        setIsJoining(false);
        return;
      }
      sessionStorage.setItem('cc_username', username.trim());
      navigate(`/room/${roomCode.trim().toUpperCase()}`);
    } catch (err) {
      setError('Failed to connect. Is the server running?');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Gradient orbs */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-electric-blue/20 rounded-full blur-[100px] animate-float" />
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-electric-violet/20 rounded-full blur-[100px] animate-float" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-electric-cyan/10 rounded-full blur-[120px]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo / Header */}
        <div className="text-center mb-10 animate-slide-down">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-electric-blue to-electric-violet shadow-2xl shadow-electric-blue/30 mb-4">
            <Cpu size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Circuit<span className="text-electric-blue">Collab</span>
          </h1>
          <p className="text-dark-400 mt-2 text-sm">
            Real-time collaborative circuit simulator with hand gesture control
          </p>
        </div>

        {/* Features badges */}
        <div className="flex items-center justify-center gap-3 mb-8 animate-fade-in">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-dark-700/50 border border-dark-600/30 text-[11px] text-dark-300">
            <Zap size={12} className="text-electric-amber" />
            Live Simulation
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-dark-700/50 border border-dark-600/30 text-[11px] text-dark-300">
            <Users size={12} className="text-electric-blue" />
            Real-time Collab
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-dark-700/50 border border-dark-600/30 text-[11px] text-dark-300">
            <Hand size={12} className="text-electric-violet" />
            Gesture Control
          </div>
        </div>

        {/* Main card */}
        <div className="bg-dark-800/60 backdrop-blur-xl border border-dark-600/40 rounded-2xl p-6 shadow-2xl animate-slide-up">
          {/* Username input */}
          <div className="mb-5">
            <label className="text-[11px] font-medium text-dark-400 uppercase tracking-wider mb-1.5 block">
              Your Name
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name..."
              className="w-full px-4 py-3 bg-dark-700/50 rounded-xl text-sm text-dark-100 placeholder-dark-500 border border-dark-600/30 focus:border-electric-blue focus:ring-2 focus:ring-electric-blue/20 outline-none transition-all"
              maxLength={20}
            />
          </div>

          {/* Create Room button */}
          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-electric-blue to-electric-violet text-white font-medium rounded-xl hover:shadow-lg hover:shadow-electric-blue/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {isCreating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Zap size={18} />
                Create New Room
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-dark-600/50" />
            <span className="text-[11px] text-dark-500 uppercase tracking-wider">or join existing</span>
            <div className="flex-1 h-px bg-dark-600/50" />
          </div>

          {/* Join Room */}
          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter room code..."
              className="flex-1 px-4 py-3 bg-dark-700/50 rounded-xl text-sm text-dark-100 placeholder-dark-500 border border-dark-600/30 focus:border-electric-cyan focus:ring-2 focus:ring-electric-cyan/20 outline-none transition-all font-mono tracking-wider"
              maxLength={6}
            />
            <button
              onClick={handleJoinRoom}
              disabled={isJoining}
              className="px-5 py-3 bg-dark-700 hover:bg-dark-600 text-dark-200 hover:text-white font-medium rounded-xl border border-dark-600/50 hover:border-electric-cyan/40 transition-all duration-300 disabled:opacity-50"
            >
              {isJoining ? <Loader2 size={18} className="animate-spin" /> : 'Join'}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[12px] text-red-400 animate-slide-up">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-dark-600 mt-6">
          Built with React · Socket.io · MediaPipe · React Flow
        </p>
      </div>
    </div>
  );
};

export default RoomLobby;
