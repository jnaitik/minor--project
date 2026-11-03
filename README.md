# CircuitCollab — Real-Time Collaborative Circuit Simulator & DC Analyzer

A full-stack web application that enables multiple users to collaboratively design, analyze, and simulate electronic circuits in real-time with Modified Nodal Analysis (MNA).

![Tech Stack](https://img.shields.io/badge/React-TypeScript-blue) ![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-green) ![Solver](https://img.shields.io/badge/MNA-DC_Analysis-cyan)

## 🚀 Features

- **Real-time Collaboration** — Multiple users can join the same room and edit circuits simultaneously
- **Circuit Simulation** — DC steady-state analysis using Modified Nodal Analysis (MNA)
- **Component Library** — Resistor, Capacitor, Inductor, DC Voltage Source, Ground, LED, Switch
- **Drag & Drop Workspace** — Responsive component placement with collision avoidance and grid snapping
- **Simulation Results** — Node voltages, branch currents, component power dissipation, and diode conduction states
- **User Presence** — See other users' live cursors and updates in real-time

## 📋 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS 3 |
| Circuit Canvas | React Flow (@xyflow/react) |
| State Management | Zustand |
| Solver | Modified Nodal Analysis (MNA) |
| Backend | Node.js + Express + Socket.io |
| Database | In-memory room store |

## 🛠️ Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **npm** 9+

## 📦 Installation

1. **Clone/navigate to the project directory:**
   ```bash
   cd "minor project"
   ```

2. **Install dependencies:**
   ```bash
   npm run install:all
   ```

3. **Start development servers (frontend + backend):**
   ```bash
   npm run dev
   ```

   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:3001`

## 🎮 Usage

### Basic Workflow

1. **Open the app** at `http://localhost:5173`
2. **Enter your name** and click "Create New Room" or "Join Room" with a 6-character code
3. **Drag components** from the left sidebar onto the canvas
4. **Connect wires** by dragging from one component terminal handle to another
5. **Edit values** — Click a component to view and modify its properties in the right sidebar
6. **Run Simulation** — Click the prominent green "Simulate" button in the toolbar
7. **View Results** — Node voltages, branch currents, and component power are displayed in the results table and on the canvas

### Collaboration

1. **Create a room** — Click "Create New Room" to get a 6-character room code
2. **Share the code** — Click the room code in the toolbar to copy it
3. **Join a room** — Enter the room code on another browser tab/device
4. **See others** — Remote collaborators' cursors appear on the canvas in real-time

## ⚡ Circuit Solver

The DC solver uses **Modified Nodal Analysis (MNA)**:

1. **Build topology** — Union-Find to identify electrical nodes from wired connections
2. **Ground reference** — Selected ground node is anchored to 0V
3. **Stamp components** — Resistors add conductance stamps; voltage sources add current variables; SPICE GMIN regularizer prevents floating node singularity
4. **Solve** — Gaussian elimination with partial pivoting on the MNA matrix
5. **Extract results** — Node voltages, branch currents, power dissipation, and forward-biased LED states
