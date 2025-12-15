#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>
#include <Preferences.h>

// --- CONFIGURATION ---
const char* ssid = "Zoo";
const char* password = "Mirha@2023";
// Default Server IP (can be updated via Serial command: SET_IP 192.168.x.x)
String ws_server_ip = "192.168.0.3"; 
const int ws_port = 5000;
const int STATION_ID = 1;

// --- PINS ---
const int SERVO_PIN = 13;
const int IR_SLOT1_PIN = 18; 
const int IR_SLOT2_PIN = 19; 
const int IR_SLOT3_PIN = 5;
const int IR_ENTRANCE_PIN = 23;

// --- OBJECTS ---
WebSocketsClient webSocket;
Servo gateServo;
LiquidCrystal_I2C lcd(0x27, 16, 2);
Preferences preferences;

// --- STATE ---
bool isGateOpen = false;
unsigned long gateOpenTime = 0;
const unsigned long GATE_OPEN_DURATION = 5000;
bool isScanning = false;
unsigned long scanStartTime = 0;
const unsigned long SCAN_TIMEOUT = 10000; // Reset scanning after 10s if no response

// Debounce
unsigned long lastDebounceTime[4] = {0, 0, 0, 0};
int lastSensorState[4] = {HIGH, HIGH, HIGH, HIGH};
const unsigned long DEBOUNCE_DELAY = 200;
bool lastEntranceState = HIGH;
unsigned long lastEntranceDebounceTime = 0;

void setup() {
  Serial.begin(115200);
  
  // Load Saved IP
  preferences.begin("config", false); // Namespace "config", read/write
  String savedIP = preferences.getString("server_ip", "");
  if (savedIP.length() > 0) {
    ws_server_ip = savedIP;
    Serial.println("Loaded Saved IP: " + ws_server_ip);
  } else {
    Serial.println("Using Default IP: " + ws_server_ip);
  }

  // LCD Setup
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Booting...");
  lcd.setCursor(0, 1);
  lcd.print(ws_server_ip); // Show IP on boot
  delay(2000);

  // Servo Setup
  gateServo.attach(SERVO_PIN);
  gateServo.write(0); 

  // Sensor Setup
  pinMode(IR_SLOT1_PIN, INPUT);
  pinMode(IR_SLOT2_PIN, INPUT);
  pinMode(IR_SLOT3_PIN, INPUT);
  pinMode(IR_ENTRANCE_PIN, INPUT);

  // WiFi Connect
  connectWiFi();

  // WebSocket Connect
  connectWebSocket();
}

void loop() {
  webSocket.loop();
  checkSerialForConfig(); // Check for IP updates

  // Handle Gate Auto-Close
  if (isGateOpen && millis() - gateOpenTime > GATE_OPEN_DURATION) {
    closeGate();
  }

  // Handle Scan Timeout
  if (isScanning && millis() - scanStartTime > SCAN_TIMEOUT) {
    isScanning = false;
    resetLCD();
  }

  // Read Sensors
  checkSensor(IR_SLOT1_PIN, 1, 0);
  checkSensor(IR_SLOT2_PIN, 2, 1);
  checkSensor(IR_SLOT3_PIN, 3, 2);
  checkEntranceSensor();
}

void connectWiFi() {
  lcd.clear();
  lcd.print("Connecting WiFi");
  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected");
    lcd.setCursor(0, 1);
    lcd.print("Success!");
  } else {
    Serial.println("\nWiFi Failed");
    lcd.setCursor(0, 1);
    lcd.print("WiFi Failed");
  }
  delay(1000);
  resetLCD();
}

void connectWebSocket() {
  Serial.println("Connecting WS to: " + ws_server_ip);
  webSocket.begin(ws_server_ip.c_str(), ws_port, "/ws");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

// --- Dynamic Configuration ---
void checkSerialForConfig() {
  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    
    if (input.startsWith("SET_IP ")) {
      String newIP = input.substring(7);
      if (newIP.length() > 6) { // Basic validation
        preferences.putString("server_ip", newIP);
        Serial.println("Saved New IP: " + newIP);
        Serial.println("Restarting...");
        lcd.clear();
        lcd.print("IP Updated!");
        lcd.setCursor(0, 1);
        lcd.print("Restarting...");
        delay(1000);
        ESP.restart();
      }
    } else if (input == "GET_IP") {
      Serial.println("Current Server IP: " + ws_server_ip);
    }
  }
}

void resetLCD() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Welcome");
  lcd.setCursor(0, 1);
  lcd.print("Available"); 
}

void checkSensor(int pin, int slotId, int index) {
  int reading = digitalRead(pin);
  if (reading != lastSensorState[index]) {
    lastDebounceTime[index] = millis();
  }
  if ((millis() - lastDebounceTime[index]) > DEBOUNCE_DELAY) {
     // Stable
  }
  
  if (reading == LOW) { // Occupied
      sendSlotUpdate(slotId, true);
  } else {
      sendSlotUpdate(slotId, false);
  }
  lastSensorState[index] = reading;
}

void checkEntranceSensor() {
  int reading = digitalRead(IR_ENTRANCE_PIN);
  
  if (reading != lastEntranceState) {
    lastEntranceDebounceTime = millis();
  }
  
  if ((millis() - lastEntranceDebounceTime) > DEBOUNCE_DELAY) {
    // If state has changed
    if (reading == LOW && !isGateOpen) { // Only trigger if gate is closed
       // Only trigger once when it goes LOW
       // But we need to make sure we don't re-trigger if it stays LOW?
       // The logic above `reading != lastEntranceState` handles the transition.
       // Wait, no. If reading is LOW and stable, this block runs every loop.
       // I need a separate "triggered" flag or just compare to a stored "stable" state.
    }
  }
  
  // Simplified logic: Just check if it went LOW and wasn't LOW before (after debounce)
  // Actually, let's just use a simple state check like the other sensors.
  static int stableEntranceState = HIGH;
  
  if ((millis() - lastEntranceDebounceTime) > DEBOUNCE_DELAY) {
    if (reading != stableEntranceState) {
      stableEntranceState = reading;
      
      if (stableEntranceState == LOW && !isScanning && !isGateOpen) {
         isScanning = true;
         scanStartTime = millis();
         
         lcd.clear();
         lcd.setCursor(0, 0);
         lcd.print("Car Detected");
         lcd.setCursor(0, 1);
         lcd.print("Please wait...");
         
         String json = "{\"type\":\"CAMERA_TRIGGER\", \"stationId\": " + String(STATION_ID) + "}";
         webSocket.sendTXT(json);
      }
    }
  }
  
  lastEntranceState = reading;
}

void sendSlotUpdate(int slotId, bool isOccupied) {
  static bool lastStatus[4] = {false, false, false, false}; 
  if (lastStatus[slotId] != isOccupied) {
      String json = "{\"type\":\"SLOT_UPDATE\", \"stationId\": " + String(STATION_ID) + 
                    ", \"slotId\": " + String(slotId) + 
                    ", \"isOccupied\": " + (isOccupied ? "true" : "false") + "}";
      webSocket.sendTXT(json);
      lastStatus[slotId] = isOccupied;
  }
}

void openGate(String userName, int slotId) {
  Serial.println("Opening Gate");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Welcome " + userName.substring(0, 8));
  lcd.setCursor(0, 1);
  if (slotId > 0) {
    lcd.print("Go to Slot " + String(slotId)); 
  } else {
    lcd.print("Authorized");
  }
  gateServo.write(90); 
  isGateOpen = true;
  isScanning = false; // Stop scanning mode
  gateOpenTime = millis();
}

void denyAccess() {
  Serial.println("Access Denied");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Access Denied");
  lcd.setCursor(0, 1);
  lcd.print("Not Booked");
  isScanning = false; // Stop scanning mode
  delay(3000);
  resetLCD();
}

void closeGate() {
  Serial.println("Closing Gate");
  gateServo.write(0); 
  isGateOpen = false;
  resetLCD();
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("WS Disconnected");
      break;
    case WStype_CONNECTED:
      Serial.println("WS Connected");
      webSocket.sendTXT("{\"type\":\"REGISTER_ESP32\", \"stationId\": " + String(STATION_ID) + "}");
      break;
    case WStype_TEXT:
      Serial.printf("WS Message: %s\n", payload);
      String msg = (char*)payload;
      if (msg.indexOf("GATE_OPEN") >= 0) {
        String name = "";
        int slotId = 0;
        
        int nameIdx = msg.indexOf("\"name\":\"");
        if (nameIdx > 0) {
           int endIdx = msg.indexOf("\"", nameIdx + 8);
           name = msg.substring(nameIdx + 8, endIdx);
        }
        
        int slotIdx = msg.indexOf("\"slotId\":");
        if (slotIdx > 0) {
           // Simple parse, assuming it's followed by number and comma or brace
           String slotStr = msg.substring(slotIdx + 9);
           slotId = slotStr.toInt();
        }
        
        openGate(name, slotId);
      } else if (msg.indexOf("GATE_DENIED") >= 0) {
        denyAccess();
      }
      break;
  }
}
