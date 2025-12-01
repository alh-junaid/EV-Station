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
from datetime import datetime

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
        print("✓ OCR Enabled (EasyOCR)")
except Exception as e:
    print('⚠ OCR not available:', e)
    reader = None

try:
    import websocket as _ws  # pip install websocket-client
    websocket = _ws
    print("✓ WebSocket client loaded")
except Exception as e:
    print('⚠ websocket-client not available:', e)
    websocket = None

# --- CONFIGURATION ---
SERVER_URL = "http://localhost:5000"
WS_URL = "ws://localhost:5000/ws"
STATION_ID = 1
CAMERA_ID = 0 # Default USB camera
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds

# Create captures directory
CAPTURES_DIR = "captures"
if not os.path.exists(CAPTURES_DIR):
    os.makedirs(CAPTURES_DIR)
    print(f"✓ Created {CAPTURES_DIR}/ directory")

# --- STATE ---
should_capture = False

def log(message):
    """Print with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}", flush=True)

def on_message(ws, message):
    global should_capture
    log(f"📨 Received: {message}")
    try:
        data = json.loads(message)
        if data.get("type") == "CAMERA_TRIGGER":
             # Accept trigger for this station OR if stationId is missing (broadcast)
             target_station = data.get("stationId")
             if target_station is None or target_station == STATION_ID:
                log("🎥 TRIGGER RECEIVED! Starting capture sequence...")
                should_capture = True
             else:
                log(f"ℹ Ignored trigger for station {target_station}")
    except Exception as e:
        log(f"⚠ Error parsing message: {e}")

def on_error(ws, error):
    log(f"❌ WebSocket Error: {error}")

def on_close(ws, close_status_code, close_msg):
    log("🔌 WebSocket Closed")

def on_open(ws):
    log("✓ WebSocket Connected to Server")
    # Register as a CAMERA so server can distinguish it from browser clients
    try:
        ws.send(json.dumps({"type": "REGISTER_CAMERA", "stationId": STATION_ID}))
        log(f"✓ Registered as CAMERA for Station {STATION_ID}")
    except Exception as e:
        log(f"⚠ Registration error: {e}")

def ws_thread():
    if websocket is None:
        log('⚠ Skipping WebSocket thread because websocket-client is not available.')
        return

    ws = websocket.WebSocketApp(WS_URL,
                                on_open=on_open,
                                on_message=on_message,
                                on_error=on_error,
                                on_close=on_close)
    ws.run_forever()

def save_image(frame, prefix="capture"):
    """Save image with timestamp"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{CAPTURES_DIR}/{prefix}_{timestamp}.jpg"
    cv2.imwrite(filename, frame)
    log(f"💾 Saved: {filename}")
    return filename

def process_frame_with_retry(frame):
    """Try to detect plate with retries"""
    log("="*60)
    log("🔍 STARTING PLATE DETECTION SEQUENCE")
    log("="*60)
    
    for attempt in range(1, MAX_RETRIES + 1):
        log(f"📸 Attempt {attempt}/{MAX_RETRIES}")
        
        # Save the captured image
        saved_file = save_image(frame, f"attempt{attempt}")
        
        # Try to detect plate
        plate_number = detect_plate(frame)
        
        if plate_number:
            log(f"✅ SUCCESS! Plate detected: {plate_number}")
            # Check booking
            check_booking(plate_number)
            return True
        else:
            log(f"❌ No plate detected in attempt {attempt}")
            if attempt < MAX_RETRIES:
                log(f"⏳ Waiting {RETRY_DELAY}s before retry...")
                time.sleep(RETRY_DELAY)
    
    log("❌ FAILED: No plate detected after 3 attempts")
    log("="*60)
    return False

def detect_plate(frame):
    """Detect plate from frame, return plate number or None"""
    # Convert to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Detect text (only if OCR reader is available)
    if reader is None:
        log('⚠ OCR disabled or not available. Skipping text detection.')
        log('💡 To enable OCR: pip install easyocr && set ENABLE_OCR=1')
        return None

    log("🔎 Running OCR on image...")
    try:
        result = reader.readtext(gray)
    except Exception as e:
        log(f'❌ OCR Error: {e}')
        return None

    if not result:
        log("⚠ No text detected in image")
        return None

    log(f"📝 Found {len(result)} text regions")
    for i, (bbox, text, prob) in enumerate(result):
        log(f"  Region {i+1}: '{text}' (confidence: {prob:.2f})")
        if prob > 0.5:
            # Clean text (remove spaces, special chars)
            clean_text = ''.join(e for e in text if e.isalnum()).upper()
            
            # Validate format (optional, e.g., length > 4)
            if len(clean_text) > 4:
                log(f"✓ Valid plate candidate: {clean_text}")
                return clean_text
    
    return None

def check_booking(plate_number):
    """Check if plate has booking and send to backend"""
    log(f"🔍 Checking booking for plate: {plate_number}")
    try:
        response = requests.post(f"{SERVER_URL}/api/hardware/identify", json={
            "stationId": STATION_ID,
            "plateNumber": plate_number
        }, timeout=5)
        
        log(f"📡 Server response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("authorized"):
                log("✅ AUTHORIZED! Gate will open")
                log(f"   Booking found for: {plate_number}")
            else:
                log("🚫 NOT AUTHORIZED")
                log(f"   No valid booking for: {plate_number}")
        else:
            log(f"⚠ Server error: {response.text}")
    except Exception as e:
        log(f"❌ API Error: {e}")

def main():
    global should_capture
    
    log("="*60)
    log("🚗 EV STATION CAMERA SYSTEM STARTED")
    log("="*60)
    log(f"📍 Station ID: {STATION_ID}")
    log(f"🎥 Camera ID: {CAMERA_ID}")
    log(f"💾 Captures saved to: {CAPTURES_DIR}/")
    log(f"🔄 Max retries: {MAX_RETRIES}")
    log("="*60)
    
    # Start WebSocket thread
    t = threading.Thread(target=ws_thread)
    t.daemon = True
    t.start()
    
    time.sleep(1)  # Give WebSocket time to connect
    
    cap = cv2.VideoCapture(CAMERA_ID)
    
    if not cap.isOpened():
        log("❌ ERROR: Could not open camera!")
        return
    
    log("✓ Camera opened successfully")
    log("⏳ Waiting for IR sensor trigger from ESP32...")
    log("💡 Press 'c' to manually trigger capture")
    log("💡 Press 'q' to quit")
    log("")
    
    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            log("⚠ Failed to read frame")
            break
            
        # Show feed
        cv2.imshow('EV Station Camera', frame)
        
        # Heartbeat every ~5 seconds (assuming ~30fps)
        frame_count += 1
        if frame_count % 150 == 0:
            print(".", end="", flush=True) # Minimal heartbeat
            
        # Logic: Only process if triggered
        if should_capture:
            log("")
            log("🎬 CAPTURE TRIGGERED!")
            process_frame_with_retry(frame)
            should_capture = False # Reset trigger
            log("")
            log("⏳ Ready for next trigger...")
            
        # Manual trigger for testing (Press 'c')
        key = cv2.waitKey(1) & 0xFF
        if key == ord('c'):
            log("[MANUAL] Manual trigger (pressed 'c')")
            should_capture = True
        elif key == ord('q'):
            log("[QUIT] Quitting...")
            break
            
    cap.release()
    cv2.destroyAllWindows()
    log("Camera system stopped")

if __name__ == "__main__":
    main()
