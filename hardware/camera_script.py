import sys
import io

# Force UTF-8 encoding for stdout to handle progress bars on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
import cv2
import requests
import time
import json
import threading

# Optional heavy imports (easyocr, websocket). We import them lazily or
# catch ImportError so the script can run in environments where torch/PIL
# aren't installed (common on Windows without a prepared wheel).
ENABLE_OCR = os.environ.get('ENABLE_OCR', '0') == '1' or '--ocr' in sys.argv

reader = None
websocket = None
try:
    if ENABLE_OCR:
        import easyocr
        reader = easyocr.Reader(['en'])
except Exception as e:
    print('OCR not available:', e)
    reader = None

try:
    import websocket as _ws  # pip install websocket-client
    websocket = _ws
except Exception as e:
    print('websocket-client not available:', e)
    websocket = None

# --- CONFIGURATION ---
SERVER_URL = "http://localhost:5000"
WS_URL = "ws://localhost:5000/ws"
STATION_ID = 1
CAMERA_ID = 0 # Default USB camera

# --- STATE ---
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
    # Register as a CAMERA so server can distinguish it from browser clients
    try:
        ws.send(json.dumps({"type": "REGISTER_CAMERA", "stationId": STATION_ID}))
    except Exception:
        # Fallback to REGISTER_CLIENT if server is older
        ws.send(json.dumps({"type": "REGISTER_CLIENT", "stationId": STATION_ID}))

def ws_thread():
    if websocket is None:
        print('Skipping WebSocket thread because websocket-client is not available.')
        return

    ws = websocket.WebSocketApp(WS_URL,
                                on_open=on_open,
                                on_message=on_message,
                                on_error=on_error,
                                on_close=on_close)
    ws.run_forever()
    # WebSocket thread runs and receives messages handled by `on_message`.
    # No OCR processing should happen here; OCR happens in the main loop when
    # a capture is triggered.

def process_frame(frame):
    print("Saving debug image to captured_debug.jpg...")
    cv2.imwrite('captured_debug.jpg', frame)

    # Convert to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Detect text (only if OCR reader is available)
    if reader is None:
        print('OCR disabled or not available. Skipping text detection.')
        return

    print("Reading text from image...")
    try:
        result = reader.readtext(gray)
    except Exception as e:
        print('Error while running OCR:', e)
        return

    if not result:
        print("No text detected.")

    for (bbox, text, prob) in result:
        if prob > 0.5:
            print(f"Detected: {text} (Prob: {prob:.2f})")
            print(f"Scanned Plate: {text}") # User confirmation
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
