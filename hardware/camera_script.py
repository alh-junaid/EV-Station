import cv2
import easyocr
import requests
import time
import json
import websocket # pip install websocket-client
import threading

# --- CONFIGURATION ---
SERVER_URL = "http://localhost:5000"
WS_URL = "ws://localhost:5000/ws"
STATION_ID = 1
CAMERA_ID = 0 # Default USB camera

# --- STATE ---
reader = easyocr.Reader(['en'])
should_capture = False

def on_message(ws, message):
    global should_capture
    print(f"Received: {message}")
    data = json.loads(message)
    if data.get("type") == "CAMERA_TRIGGER" and data.get("stationId") == STATION_ID:
        print("Trigger received! Capturing...")
        should_capture = True

def on_error(ws, error):
    print(f"Error: {error}")

def on_close(ws, close_status_code, close_msg):
    print("WS Closed")

def on_open(ws):
    print("WS Connected")
    # Register as a client (or specific camera type if needed)
    ws.send(json.dumps({"type": "REGISTER_CLIENT"})) # Using CLIENT for now to receive broadcasts

def ws_thread():
    ws = websocket.WebSocketApp(WS_URL,
                                on_open=on_open,
                                on_message=on_message,
                                on_error=on_error,
                                on_close=on_close)
    ws.run_forever()

def process_frame(frame):
    # Convert to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Detect text
    result = reader.readtext(gray)
    
    for (bbox, text, prob) in result:
        if prob > 0.5:
            print(f"Detected: {text} (Prob: {prob:.2f})")
            # Clean text (remove spaces, special chars)
            clean_text = ''.join(e for e in text if e.isalnum()).upper()
            
            # Validate format (optional, e.g., length > 4)
            if len(clean_text) > 4:
                check_booking(clean_text)

def check_booking(plate_number):
    try:
        # In a real app, we might want to debounce this call
        response = requests.post(f"{SERVER_URL}/api/hardware/identify", json={
            "stationId": STATION_ID,
            "plateNumber": plate_number
        })
        if response.status_code == 200:
            data = response.json()
            if data.get("authorized"):
                print("Authorized! Gate opening...")
                # The server should handle sending the OPEN command to ESP32
            else:
                print("Not authorized.")
    except Exception as e:
        print(f"API Error: {e}")

def main():
    global should_capture
    
    # Start WebSocket thread
    t = threading.Thread(target=ws_thread)
    t.daemon = True
    t.start()
    
    cap = cv2.VideoCapture(CAMERA_ID)
    
    print("Camera System Started. Waiting for Trigger...")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        # Show feed
        cv2.imshow('EV Station Camera', frame)
        
        # Logic: Only process if triggered
        if should_capture:
            print("Processing frame...")
            process_frame(frame)
            should_capture = False # Reset trigger
            
        # Manual trigger for testing (Press 'c')
        key = cv2.waitKey(1) & 0xFF
        if key == ord('c'):
            should_capture = True
        elif key == ord('q'):
            break
            
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
