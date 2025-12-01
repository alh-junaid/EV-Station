import sys
import io
import os
import cv2
import requests
import time
import json
import threading
import re
from datetime import datetime

# Force UTF-8 encoding for stdout (helps, but we will also remove emojis to be safe)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Check for OCR flag
ENABLE_OCR = os.environ.get('ENABLE_OCR', '0') == '1' or '--ocr' in sys.argv

reader = None
websocket = None

try:
    if ENABLE_OCR:
        import easyocr
        reader = easyocr.Reader(['en'])
        print("[INFO] OCR Enabled (EasyOCR)")
except Exception as e:
    print('[WARN] OCR not available:', e)
    reader = None

try:
    import websocket as _ws
    websocket = _ws
    print("[INFO] WebSocket client loaded")
except Exception as e:
    print('[WARN] websocket-client not available:', e)
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
    log(f"[MSG] Received: {message}")
    try:
        data = json.loads(message)
        if data.get("type") == "CAMERA_TRIGGER":
             # Accept trigger for this station OR if stationId is missing (broadcast)
             target_station = data.get("stationId")
             if target_station is None or target_station == STATION_ID:
                log("[TRIG] TRIGGER RECEIVED! Starting capture sequence...")
                should_capture = True
             else:
                log(f"[INFO] Ignored trigger for station {target_station}")
    except Exception as e:
        log(f"[ERR] Error parsing message: {e}")

def on_error(ws, error):
    log(f"[ERR] WebSocket Error: {error}")

def on_close(ws, close_status_code, close_msg):
    log("[INFO] WebSocket Closed")

def on_open(ws):
    log("[INFO] WebSocket Connected to Server")
    # Register as a CAMERA so server can distinguish it from browser clients
    try:
        ws.send(json.dumps({"type": "REGISTER_CAMERA", "stationId": STATION_ID}))
        log(f"[INFO] Registered as CAMERA for Station {STATION_ID}")
    except Exception as e:
        log(f"[WARN] Registration error: {e}")

def ws_thread():
    if websocket is None:
        log('[WARN] Skipping WebSocket thread because websocket-client is not available.')
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
    log(f"[SAVE] Saved: {filename}")
    return filename

def process_frame_with_retry(frame):
    """Try to detect plate with retries"""
    log("="*60)
    log("[INFO] STARTING PLATE DETECTION SEQUENCE")
    log("="*60)
    
    for attempt in range(1, MAX_RETRIES + 1):
        log(f"[INFO] Attempt {attempt}/{MAX_RETRIES}")
        
        # Save the captured image
        saved_file = save_image(frame, f"attempt{attempt}")
        
        # Try to detect plate
        plate_number = detect_plate(frame)
        
        if plate_number:
            log(f"[SUCCESS] Plate detected: {plate_number}")
            # Check booking
            check_booking(plate_number)
            return True
        else:
            log(f"[FAIL] No plate detected in attempt {attempt}")
            if attempt < MAX_RETRIES:
                log(f"[WAIT] Waiting {RETRY_DELAY}s before retry...")
                time.sleep(RETRY_DELAY)
    
    log("[FAIL] No plate detected after 3 attempts")
    log("="*60)
    return False

def get_preprocessed_variants(frame):
    """Generate multiple preprocessed versions of the frame to try"""
    variants = []
    
    # 1. Grayscale + Bilateral (Standard)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    bi = cv2.bilateralFilter(gray, 11, 17, 17)
    variants.append(("Standard", bi))
    
    # 2. CLAHE (Contrast Enhancement) - Good for shadows
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    cl = clahe.apply(gray)
    variants.append(("Contrast", cl))
    
    # 3. Adaptive Threshold (Binary) - Good for clear text
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    variants.append(("Threshold", thresh))
    
    return variants

def heuristic_clean(text):
    """Fix common OCR errors based on Indian Plate format (LLNNLLNNNN)"""
    # LL = 2 Letters (State)
    # NN = 2 Numbers (District)
    # LL = 2 Letters (Series) - Sometimes 1 Letter
    # NNNN = 4 Numbers (Unique ID)
    
    # Common confusions
    to_digit = {'O': '0', 'I': '1', 'Z': '2', 'S': '5', 'B': '8', 'G': '6', 'Q': '0', 'D': '0', 'A': '4'}
    to_alpha = {'0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B', '6': 'G', '4': 'A'}
    
    # Remove any non-alphanumeric
    clean = ''.join(c for c in text if c.isalnum()).upper()
    
    # If length is 10 (Standard: RJ14CV0002), try to force mask LLNNLLNNNN
    if len(clean) == 10:
        res = list(clean)
        # 0,1: Letters
        res[0] = to_alpha.get(res[0], res[0])
        res[1] = to_alpha.get(res[1], res[1])
        # 2,3: Digits
        res[2] = to_digit.get(res[2], res[2])
        res[3] = to_digit.get(res[3], res[3])
        # 4,5: Letters
        res[4] = to_alpha.get(res[4], res[4])
        res[5] = to_alpha.get(res[5], res[5])
        # 6-9: Digits
        res[6] = to_digit.get(res[6], res[6])
        res[7] = to_digit.get(res[7], res[7])
        res[8] = to_digit.get(res[8], res[8])
        res[9] = to_digit.get(res[9], res[9])
        
        candidate = "".join(res)
        # Verify strict pattern
        if re.match(r'^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$', candidate):
            return candidate

    # If length is 9 (Older: KA01A1234), try mask LLNNLNNNN
    if len(clean) == 9:
        res = list(clean)
        # 0,1: Letters
        res[0] = to_alpha.get(res[0], res[0])
        res[1] = to_alpha.get(res[1], res[1])
        # 2,3: Digits
        res[2] = to_digit.get(res[2], res[2])
        res[3] = to_digit.get(res[3], res[3])
        # 4: Letter
        res[4] = to_alpha.get(res[4], res[4])
        # 5-8: Digits
        res[5] = to_digit.get(res[5], res[5])
        res[6] = to_digit.get(res[6], res[6])
        res[7] = to_digit.get(res[7], res[7])
        res[8] = to_digit.get(res[8], res[8])
        
        candidate = "".join(res)
        if re.match(r'^[A-Z]{2}[0-9]{2}[A-Z]{1}[0-9]{4}$', candidate):
            return candidate

    # Fallback: Just try to fix last 4 digits
    if len(clean) >= 4:
        prefix = clean[:-4]
        suffix = clean[-4:]
        new_suffix = ''.join([to_digit.get(c, c) for c in suffix])
        if new_suffix.isdigit():
            return prefix + new_suffix
            
    return clean

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
    log(f"[MSG] Received: {message}")
    try:
        data = json.loads(message)
        if data.get("type") == "CAMERA_TRIGGER":
             # Accept trigger for this station OR if stationId is missing (broadcast)
             target_station = data.get("stationId")
             if target_station is None or target_station == STATION_ID:
                log("[TRIG] TRIGGER RECEIVED! Starting capture sequence...")
                should_capture = True
             else:
                log(f"[INFO] Ignored trigger for station {target_station}")
    except Exception as e:
        log(f"[ERR] Error parsing message: {e}")

def on_error(ws, error):
    log(f"[ERR] WebSocket Error: {error}")

def on_close(ws, close_status_code, close_msg):
    log("[INFO] WebSocket Closed")

def on_open(ws):
    log("[INFO] WebSocket Connected to Server")
    # Register as a CAMERA so server can distinguish it from browser clients
    try:
        ws.send(json.dumps({"type": "REGISTER_CAMERA", "stationId": STATION_ID}))
        log(f"[INFO] Registered as CAMERA for Station {STATION_ID}")
    except Exception as e:
        log(f"[WARN] Registration error: {e}")

def ws_thread():
    if websocket is None:
        log('[WARN] Skipping WebSocket thread because websocket-client is not available.')
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
    log(f"[SAVE] Saved: {filename}")
    return filename

def process_frame_with_retry(frame):
    """Try to detect plate with retries"""
    log("="*60)
    log("[INFO] STARTING PLATE DETECTION SEQUENCE")
    log("="*60)
    
    for attempt in range(1, MAX_RETRIES + 1):
        log(f"[INFO] Attempt {attempt}/{MAX_RETRIES}")
        
        # Save the captured image
        saved_file = save_image(frame, f"attempt{attempt}")
        
        # Try to detect plate
        plate_number = detect_plate(frame)
        
        if plate_number:
            log(f"[SUCCESS] Plate detected: {plate_number}")
            # Check booking
            check_booking(plate_number)
            return True
        else:
            log(f"[FAIL] No plate detected in attempt {attempt}")
            if attempt < MAX_RETRIES:
                log(f"[WAIT] Waiting {RETRY_DELAY}s before retry...")
                time.sleep(RETRY_DELAY)
    
    log("[FAIL] No plate detected after 3 attempts")
    log("="*60)
    return False

def get_preprocessed_variants(frame):
    """Generate multiple preprocessed versions of the frame to try"""
    variants = []
    
    # 1. Grayscale + Bilateral (Standard)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    bi = cv2.bilateralFilter(gray, 11, 17, 17)
    variants.append(("Standard", bi))
    
    # 2. CLAHE (Contrast Enhancement) - Good for shadows
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    cl = clahe.apply(gray)
    variants.append(("Contrast", cl))
    
    # 3. Adaptive Threshold (Binary) - Good for clear text
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    variants.append(("Threshold", thresh))
    
    return variants

def heuristic_clean(text):
    """Fix common OCR errors based on Indian Plate format (LLNNLLNNNN)"""
    # LL = 2 Letters (State)
    # NN = 2 Numbers (District)
    # LL = 2 Letters (Series) - Sometimes 1 Letter
    # NNNN = 4 Numbers (Unique ID)
    
    # Common confusions
    to_digit = {'O': '0', 'I': '1', 'Z': '2', 'S': '5', 'B': '8', 'G': '6', 'Q': '0', 'D': '0', 'A': '4', 'L': '4'}
    to_alpha = {'0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B', '6': 'G', '4': 'A'}
    
    # Remove any non-alphanumeric
    clean = ''.join(c for c in text if c.isalnum()).upper()
    
    # If length is 10 (Standard: RJ14CV0002), try to force mask LLNNLLNNNN
    if len(clean) == 10:
        res = list(clean)
        # 0,1: Letters
        res[0] = to_alpha.get(res[0], res[0])
        res[1] = to_alpha.get(res[1], res[1])
        # 2,3: Digits
        res[2] = to_digit.get(res[2], res[2])
        res[3] = to_digit.get(res[3], res[3])
        # 4,5: Letters
        res[4] = to_alpha.get(res[4], res[4])
        res[5] = to_alpha.get(res[5], res[5])
        # 6-9: Digits
        res[6] = to_digit.get(res[6], res[6])
        res[7] = to_digit.get(res[7], res[7])
        res[8] = to_digit.get(res[8], res[8])
        res[9] = to_digit.get(res[9], res[9])
        
        candidate = "".join(res)
        # Verify strict pattern
        if re.match(r'^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$', candidate):
            return candidate

    # If length is 9 (Older: KA01A1234), try mask LLNNLNNNN
    if len(clean) == 9:
        res = list(clean)
        # 0,1: Letters
        res[0] = to_alpha.get(res[0], res[0])
        res[1] = to_alpha.get(res[1], res[1])
        # 2,3: Digits
        res[2] = to_digit.get(res[2], res[2])
        res[3] = to_digit.get(res[3], res[3])
        # 4: Letter
        res[4] = to_alpha.get(res[4], res[4])
        # 5-8: Digits
        res[5] = to_digit.get(res[5], res[5])
        res[6] = to_digit.get(res[6], res[6])
        res[7] = to_digit.get(res[7], res[7])
        res[8] = to_digit.get(res[8], res[8])
        
        candidate = "".join(res)
        if re.match(r'^[A-Z]{2}[0-9]{2}[A-Z]{1}[0-9]{4}$', candidate):
            return candidate

    # Fallback: Just try to fix last 4 digits
    if len(clean) >= 4:
        prefix = clean[:-4]
        suffix = clean[-4:]
        new_suffix = ''.join([to_digit.get(c, c) for c in suffix])
        if new_suffix.isdigit():
            return prefix + new_suffix
            
    return clean

def detect_plate(frame):
    """Detect plate from frame using multiple preprocessing strategies"""
    if reader is None:
        log('[WARN] OCR disabled or not available. Skipping text detection.')
        log('[INFO] To enable OCR: pip install easyocr && set ENABLE_OCR=1')
        return None

    log("[INFO] Running OCR (trying multiple filters)...")
    
    best_text = None
    best_conf = 0.0
    best_is_plate = False # Track if we found a "perfect" plate structure
    
    variants = get_preprocessed_variants(frame)
    
    for name, img in variants:
        try:
            # allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' improves accuracy
            result = reader.readtext(img, allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
        except Exception as e:
            continue

        if not result:
            continue

        for i, (bbox, text, prob) in enumerate(result):
            # Clean text
            clean_text = ''.join(e for e in text if e.isalnum()).upper()
            
            # Filter noise (Timestamps are usually long, plates are 8-10 chars)
            if len(clean_text) < 6 or len(clean_text) > 11:
                continue
            
            # Apply heuristic cleaning
            cleaned_plate = heuristic_clean(clean_text)
            
            # Check if it looks like an Indian Plate (e.g., KA01AB1234)
            # Pattern: 2 Letters + Digits/Letters + 4 Digits
            is_plate_structure = re.match(r'^[A-Z]{2}.*[0-9]{4}$', cleaned_plate) is not None
            
            log(f"  [{name}] Found: '{clean_text}' -> '{cleaned_plate}' (conf: {prob:.2f}) {'[PLATE MATCH]' if is_plate_structure else ''}")
            
            # Priority Logic:
            # 1. Prefer "Plate Structure" matches over everything else
            # 2. Prefer Length 10 (Standard) over others
            # 3. Take higher confidence
            
            # Boost confidence for perfect length matches
            adjusted_conf = prob
            if len(cleaned_plate) == 10:
                adjusted_conf += 0.2
            
            if is_plate_structure:
                if not best_is_plate or adjusted_conf > best_conf:
                    best_conf = adjusted_conf
                    best_text = cleaned_plate
                    best_is_plate = True
            elif not best_is_plate:
                if adjusted_conf > best_conf:
                    best_conf = adjusted_conf
                    best_text = cleaned_plate
    
    # If we found something decent, return it
    if best_text:
        log(f"[SUCCESS] Best candidate: {best_text} (conf: {best_conf:.2f})")
        return best_text
        
    log("[FAIL] No valid plate detected in any variant")
    return None

def check_booking(plate_number):
    """Check with server if plate is authorized"""
    log(f"[INFO] Checking booking for plate: {plate_number}")
    try:
        url = f"{SERVER_URL}/api/hardware/identify"
        payload = {"stationId": STATION_ID, "plateNumber": plate_number}
        response = requests.post(url, json=payload, timeout=5)
        
        log(f"[INFO] Server response: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if data.get("authorized"):
                log("[AUTH] ✅ AUTHORIZED!")
                log(f"       Booking ID: {data.get('bookingId')}")
            else:
                log("[AUTH] 🚫 NOT AUTHORIZED")
                log(f"       No valid booking for: {plate_number}")
        else:
            log(f"[ERR] Server error: {response.text}")
            
    except Exception as e:
        log(f"[ERR] Failed to contact server: {e}")

def main():
    global should_capture
    
    log("="*60)
    log("[INFO] EV STATION CAMERA SYSTEM STARTED")
    log("="*60)
    log(f"[INFO] Station ID: {STATION_ID}")
    log(f"[INFO] Camera ID: {CAMERA_ID}")
    log(f"[INFO] Captures saved to: {CAPTURES_DIR}/")
    log(f"[INFO] Max retries: {MAX_RETRIES}")
    log("="*60)

    # Start WebSocket thread
    t = threading.Thread(target=ws_thread)
    t.daemon = True
    t.start()
    
    time.sleep(1)  # Give WebSocket time to connect
    
    # Open Camera
    cap = cv2.VideoCapture(CAMERA_ID)
    if not cap.isOpened():
        log("[ERR] Failed to open camera")
        return

    log("[INFO] Camera opened successfully")
    log("[INFO] Waiting for IR sensor trigger from ESP32...")
    log("[INFO] Press 'c' to manually trigger capture")
    log("[INFO] Press 'q' to quit")
    log("")
    
    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            log("[ERR] Failed to read frame")
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
            log("[TRIG] CAPTURE TRIGGERED!")
            process_frame_with_retry(frame)
            should_capture = False # Reset trigger
            log("")
            log("[INFO] Ready for next trigger...")
            
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
    log("[INFO] Camera system stopped")

if __name__ == "__main__":
    main()
