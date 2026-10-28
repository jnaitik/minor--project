# CircuitCollab — Real-Time Collaborative Hand-Gesture Controlled Circuit Simulator

A full-stack web application that enables multiple users to collaboratively design and simulate basic electronic circuits in real-time, with optional hand-gesture control via MediaPipe.

![Tech Stack](https://img.shields.io/badge/React-TypeScript-blue) ![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-green) ![MediaPipe](https://img.shields.io/badge/MediaPipe-Hand_Tracking-violet)

## 🚀 Features

- **Real-time Collaboration** — Multiple users can join the same room and edit circuits simultaneously
- **Circuit Simulation** — DC analysis using Modified Nodal Analysis (MNA)
- **Hand Gesture Control** — Use MediaPipe to control the circuit editor with hand gestures
- **Component Library** — Resistor, Capacitor, Inductor, DC Voltage Source, Ground, LED, Switch
- **Drag & Drop** — Intuitive component placement via drag or click
- **Live Results** — Node voltages, branch currents, and component power displayed in real-time
- **User Presence** — See other users' cursors and actions in real-time

## 📋 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS 3 |
| Circuit Canvas | React Flow (@xyflow/react) |
| Hand Tracking | @mediapipe/tasks-vision |
| State Management | Zustand |
| Backend | Node.js + Express + Socket.io |
| Database | In-memory (no external DB required) |

## 🛠️ Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **npm** 9+
- A modern browser with webcam access (for gesture control)

## 📦 Installation

1. **Clone/navigate to the project directory:**
   ```bash
   cd "minor project"
   ```

2. **Install all dependencies (root + server + client):**
   ```bash
   npm run install:all
   ```
   
   Or install individually:
   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   ```

## ▶️ Running the Project

### Start both server and client simultaneously:
```bash
npm run dev
```

This will start:
- **Backend server** on `http://localhost:3001`
- **Frontend dev server** on `http://localhost:5173`

### Or start them separately:

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

Then open `http://localhost:5173` in your browser.

## 🎮 Usage

### Basic Workflow

1. **Open the app** at `http://localhost:5173`
2. **Enter your name** and click "Create New Room" or "Join Room" with a code
3. **Drag components** from the left sidebar onto the canvas
4. **Connect wires** by dragging from one component's handle to another
5. **Edit values** — Click a component to see its properties in the right panel
6. **Run Simulation** — Click the green "Simulate" button in the toolbar
7. **View Results** — Voltages and currents appear on the components and in the bottom panel

### Hand Gesture Controls

Enable gesture mode by clicking the 🤚 "Gesture" button in the toolbar.

| Gesture | Action |
|---------|--------|
| 🤏 **Pinch** (thumb + index close) | Select / Grab component |
| 🤏 **Pinch + Move** | Drag component |
| 🖐️ **Open Palm + Move** | Pan the canvas |
| 👆 **Point** (index finger) | Place selected component |
| 👍 **Thumbs Up** | Run Simulation |
| ✊ **Fist** | Delete selected component |
| ✌️ **Victory / Peace** | Cycle through component types |

A virtual cursor follows your index finger with color-coded feedback.

### Collaboration

1. **Create a room** — Click "Create New Room" to get a 6-character room code
2. **Share the code** — Click the room code in the toolbar to copy it
3. **Join a room** — Enter the room code on another browser tab/device
4. **See others** — Remote users' cursors appear on the canvas in real-time

## 📁 Project Structure

```
minor project/
├── server/                     # Backend (Node.js + Express + Socket.io)
│   ├── src/
│   │   ├── index.ts            # Server entry point
│   │   ├── roomManager.ts      # Room lifecycle management
│   │   ├── circuitSolver.ts    # MNA DC circuit solver
│   │   └── types.ts            # Shared type definitions
│   ├── package.json
│   └── tsconfig.json
│
├── client/                     # Frontend (React + TypeScript + Tailwind)
│   ├── src/
│   │   ├── App.tsx             # Root with routing
│   │   ├── CircuitEditor.tsx   # Main workspace
│   │   ├── main.tsx            # Entry point
│   │   ├── index.css           # Global styles
│   │   ├── components/
│   │   │   ├── circuit/        # Canvas, palette, properties, results
│   │   │   ├── gesture/        # Engine, overlay, webcam preview
│   │   │   ├── collaboration/  # Lobby, user presence, avatars
│   │   │   └── ui/             # Toolbar, status bar, modal
│   │   ├── store/              # Zustand stores
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Socket, gesture recognizer, solver
│   │   └── types/              # TypeScript type definitions
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── package.json                # Root workspace
└── README.md                   # This file
```

## ⚡ Circuit Solver

The DC solver uses **Modified Nodal Analysis (MNA)**:

1. **Build topology** — Union-Find to identify electrical nodes from wired connections
2. **Ground reference** — One node is set to 0V
3. **Stamp components** — Resistors add conductance stamps; voltage sources add current variables
4. **Solve** — Gaussian elimination with partial pivoting on the MNA matrix
5. **Extract results** — Node voltages, branch currents, and power dissipation

**DC steady-state behavior:**
- Capacitors → Open circuit (infinite impedance)
- Inductors → Short circuit (zero impedance)
- LEDs → Simple 100Ω resistor model (lit if current > 1mA)
- Switches → Very low (closed) or very high (open) resistance

## 🔧 Building for Production

```bash
npm run build
```

This will:
1. Compile the server TypeScript to `server/dist/`
2. Build the client Vite bundle to `client/dist/`

To run the production build:
```bash
cd server && npm start
```

## 📄 License

MIT
