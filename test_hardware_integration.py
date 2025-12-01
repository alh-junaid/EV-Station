import websocket
import threading
import time
import json
import requests
import sys

# Configuration
SERVER_URL = "http://localhost:5000"
WS_URL = "ws://localhost:5000/ws"
STATION_ID = 1
TEST_PLATE = "TESTPLATE123"

# State
ws_messages = []

def on_message(ws, message):
    print(f"WS Received: {message}")
    ws_messages.append(json.loads(message))

def on_error(ws, error):
    print(f"WS Error: {error}")

def on_open(ws):
    print("WS Connected. Registering as ESP32...")
    ws.send(json.dumps({"type": "REGISTER_ESP32", "stationId": STATION_ID}))

def run_ws():
    ws = websocket.WebSocketApp(WS_URL,
                                on_open=on_open,
                                on_message=on_message,
                                on_error=on_error)
    ws.run_forever()

def main():
    print("Starting Hardware Integration Test...")
    
    # Start WS thread
    t = threading.Thread(target=run_ws)
    t.daemon = True
    t.start()
    
    time.sleep(2) # Wait for connection
    
    print(f"Sending Identify Request for Station {STATION_ID}, Plate {TEST_PLATE}...")
    try:
        response = requests.post(f"{SERVER_URL}/api/hardware/identify", json={
            "stationId": STATION_ID,
            "plateNumber": TEST_PLATE
        })
        print(f"HTTP Response: {response.status_code} {response.text}")
    except Exception as e:
        print(f"HTTP Request failed: {e}")
        print("Make sure the server is running on localhost:5000")
        sys.exit(1)

    time.sleep(2) # Wait for WS messages
    
    # Check for SCANNING message
    scanning_msg = next((m for m in ws_messages if m.get("type") == "SCANNING"), None)
    if scanning_msg:
        print("PASS: Received SCANNING message")
        print(f"  > {scanning_msg}")
    else:
        print("FAIL: Did not receive SCANNING message")
        
    # Check for GATE status (OPEN or DENIED)
    gate_msg = next((m for m in ws_messages if m.get("type") in ["GATE_OPEN", "GATE_DENIED"]), None)
    if gate_msg:
        print(f"PASS: Received {gate_msg['type']} message")
    else:
        print("FAIL: Did not receive GATE message")

if __name__ == "__main__":
    main()
