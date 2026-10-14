## Purpose

Exposes a liveness endpoint so the container runtime and developers can check the server is up.

## ADDED Requirements

### Requirement: Health check
The system SHALL respond `200` with `{ status: "ok" }` to `GET /api/health`.

#### Scenario: Server running
- **WHEN** a client calls `GET /api/health`
- **THEN** the system responds `200` with `{ status: "ok" }`
