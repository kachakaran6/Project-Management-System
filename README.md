# Project Management System (PMS)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6.svg)](https://www.typescriptlang.org/)

An enterprise-grade, real-time collaboration and project management platform designed for agile teams, engineering squads, and product organizations.

## Key Features

- **Interactive Kanban Boards**: Drag-and-drop task orchestration with column-level WIP limits and custom swimlanes.
- **Real-Time Collaboration**: Instant presence and live state synchronization powered by WebSockets (Socket.io).
- **Rich Document Editor**: Block-based TipTap editor supporting collaborative markdown notes, tables, code highlighting, and mentions.
- **Workflow Automation**: Automated task transitions, notifications, and webhook integrations.
- **Granular RBAC**: Role-based access control across organizations, workspaces, and team projects.
- **Sprint & Velocity Analytics**: Burndown charts, cycle time metrics, and cumulative flow diagrams via Recharts.

## Architecture Highlights

```
client (React 19, Zustand, TanStack Query, Radix UI)
    ↕  (REST & WebSocket via Socket.io)
backend (Express.js, Mongoose, MongoDB, Winston)
```
