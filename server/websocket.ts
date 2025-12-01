import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

interface StationClient {
  ws: WebSocket;
  type: "ESP32" | "CLIENT" | "CAMERA";
  stationId?: number;
}

export class WebSocketHandler {
  private wss: WebSocketServer;
  private clients: Set<StationClient> = new Set();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.setup();
  }

  private setup() {
    this.wss.on("connection", (ws) => {
      const client: StationClient = { ws, type: "CLIENT" }; // Default to client
      this.clients.add(client);

      console.log("New WebSocket connection");
      this.logClientSummary();

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(client, data);
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      });

      ws.on("close", () => {
        this.clients.delete(client);
        console.log("WebSocket disconnected");
        this.logClientSummary();
      });
    });
  }

  private logClientSummary() {
    const counts = { CLIENT: 0, CAMERA: 0, ESP32: 0 } as Record<string, number>;
    this.clients.forEach((c) => {
      counts[c.type] = (counts[c.type] || 0) + 1;
    });
    console.log(`WS Clients: CLIENT=${counts.CLIENT}, CAMERA=${counts.CAMERA}, ESP32=${counts.ESP32}`);
  }

  private handleMessage(client: StationClient, data: any) {
    switch (data.type) {
      case "REGISTER_ESP32":
        client.type = "ESP32";
        client.stationId = data.stationId;
        console.log(`ESP32 registered for Station ${data.stationId}`);
        this.logClientSummary();
        break;

      case "REGISTER_CAMERA":
        client.type = "CAMERA";
        client.stationId = data.stationId;
        console.log(`Camera registered for Station ${data.stationId}`);
        this.logClientSummary();
        break;

      case "REGISTER_CLIENT":
        client.type = "CLIENT";
        if (data.stationId) {
          client.stationId = data.stationId;
          console.log(`Client registered for updates (station ${data.stationId})`);
        } else {
          console.log("Client registered for updates");
        }
        this.logClientSummary();
        break;

      case "SLOT_UPDATE":
        // Use stationId from the message payload (esp32 or camera should include it)
        this.broadcastToClients({
          type: "SLOT_UPDATE",
          stationId: data.stationId ?? client.stationId,
          slotId: data.slotId,
          isOccupied: data.isOccupied,
        });
        break;

      case "CAMERA_TRIGGER":
        // Forward trigger to Camera Script (if connected via WS)
        const triggerStation = data.stationId ?? client.stationId;
        console.log(`Camera Trigger received for Station ${triggerStation}`);
        this.broadcastToClients({
          type: "CAMERA_TRIGGER",
          stationId: triggerStation,
        });
        break;

      default:
        console.warn("Unknown message type:", data.type);
    }
  }

  private broadcastToClients(message: any) {
    this.clients.forEach((client) => {
      if (client.type === "CLIENT" && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  public sendCommandToESP32(stationId: number, command: string, payload: any = {}) {
    this.clients.forEach((client) => {
      if (client.type === "ESP32" && client.stationId === stationId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({ type: command, ...payload }));
      }
    });
  }
}

let wsHandler: WebSocketHandler | null = null;

export function setupWebSocket(server: Server) {
  wsHandler = new WebSocketHandler(server);
  return wsHandler;
}

export function getWebSocketHandler() {
  return wsHandler;
}
