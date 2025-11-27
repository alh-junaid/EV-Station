import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

interface StationClient {
  ws: WebSocket;
  type: "ESP32" | "CLIENT";
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
      });
    });
  }

  private handleMessage(client: StationClient, data: any) {
    switch (data.type) {
      case "REGISTER_ESP32":
        client.type = "ESP32";
        client.stationId = data.stationId;
        console.log(`ESP32 registered for Station ${data.stationId}`);
        break;

      case "REGISTER_CLIENT":
        client.type = "CLIENT";
        console.log("Client registered for updates");
        break;

      case "SLOT_UPDATE":
        // Broadcast slot status to all web clients
        this.broadcastToClients({
          type: "SLOT_UPDATE",
          stationId: client.stationId,
          slotId: data.slotId,
          isOccupied: data.isOccupied
        });
        break;

      case "CAMERA_TRIGGER":
        // Forward trigger to Camera Script (if connected via WS)
        console.log(`Camera Trigger received from Station ${client.stationId}`);
        this.broadcastToClients({
          type: "CAMERA_TRIGGER",
          stationId: client.stationId
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
