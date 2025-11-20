import { useEffect, useRef, useState } from "react";

type SlotUpdate = {
    type: "SLOT_UPDATE";
    stationId: number;
    slotId: number;
    isOccupied: boolean;
};

export function useWebSocket() {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [slotStatus, setSlotStatus] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("Connected to WebSocket");
            ws.send(JSON.stringify({ type: "REGISTER_CLIENT" }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "SLOT_UPDATE") {
                    const update = data as SlotUpdate;
                    setSlotStatus((prev) => ({
                        ...prev,
                        [`${update.stationId}-${update.slotId}`]: update.isOccupied,
                    }));
                }
            } catch (error) {
                console.error("WS Parse Error", error);
            }
        };

        ws.onclose = () => {
            console.log("Disconnected from WebSocket");
        };

        setSocket(ws);

        return () => {
            ws.close();
        };
    }, []);

    return { socket, slotStatus };
}
