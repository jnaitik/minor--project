// ============================================================================
// App.tsx — Root application component with routing
//
// Routes:
//   / — RoomLobby (create/join room)
//   /room/:roomId — CircuitEditor (main workspace)
// ============================================================================

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RoomLobby from './components/collaboration/RoomLobby';
import CircuitEditor from './CircuitEditor';
import ErrorBoundary from './components/ui/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="CircuitCollab Application Error" fallbackMessage="An error occurred in the workspace. Click below to recover.">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoomLobby />} />
          <Route path="/room/:roomId" element={<CircuitEditor />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
