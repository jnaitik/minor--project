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

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoomLobby />} />
        <Route path="/room/:roomId" element={<CircuitEditor />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
