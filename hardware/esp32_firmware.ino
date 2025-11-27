#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>

// --- CONFIGURATION ---
const char* ssid = "zoo";
const char* password = "Mirha@2023";
const char* ws_server = "192.168.0.6"; // e.g., "192.168.1.100"
const int ws_port = 5000;
const int STATION_ID = 1;

// --- PINS ---
const int SERVO_PIN = 13;
// I2C Pins for LCD are default: SDA=21, SCL=22
const int IR_SLOT1_PIN = 18; 
const int IR_SLOT2_PIN = 19; 
const int IR_SLOT3_PIN = 5;  // Changed from 21 to 5
const int IR_ENTRANCE_PIN = 23; // Changed from 22 to 23

// --- OBJECTS ---
WebSocketsClient webSocket;
Servo gateServo;
LiquidCrystal_I2C lcd(0x27, 16, 2); // Set the LCD address to 0x27 for a 16 chars and 2 line display

// --- STATE ---
bool isGateOpen = false;
unsigned long gateOpenTime = 0;
const unsigned long GATE_OPEN_DURATION = 5000; // 5 seconds

// Debounce for sensors
unsigned long lastDebounceTime[4] = {0, 0, 0, 0};
int lastSensorState[4] = {HIGH, HIGH, HIGH, HIGH}; // HIGH = No Obstacle
const unsigned long DEBOUNCE_DELAY = 200;

void setup() {
  Serial.begin(115200);

  // LCD Setup
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Welcome to");
  lcd.setCursor(0, 1);
  lcd.print("EV Station");

  // Servo Setup
  gateServo.attach(SERVO_PIN);
  gateServo.write(0); // Close gate initially

  // Sensor Setup
  pinMode(IR_SLOT1_PIN, INPUT);
  pinMode(IR_SLOT2_PIN, INPUT);
  pinMode(IR_SLOT3_PIN, INPUT);
  pinMode(IR_ENTRANCE_PIN, INPUT);

  // WiFi Connect
  lcd.clear();
  lcd.print("Connecting WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");
  lcd.setCursor(0, 1);
  lcd.print("Connected!");
  delay(1000);
  resetLCD();

  // WebSocket Connect
  webSocket.begin(ws_server, ws_port, "/ws");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void loop() {
  webSocket.loop();

  // Handle Gate Auto-Close
  if (isGateOpen && millis() - gateOpenTime > GATE_OPEN_DURATION) {
    closeGate();
  }

  // Read Sensors
  checkSensor(IR_SLOT1_PIN, 1, 0);
  checkSensor(IR_SLOT2_PIN, 2, 1);
  checkSensor(IR_SLOT3_PIN, 3, 2);
  checkEntranceSensor();
}

void resetLCD() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Welcome");
  lcd.setCursor(0, 1);
  lcd.print("Available"); 
  // Ideally update availability count here if we tracked it locally
}

void checkSensor(int pin, int slotId, int index) {
  int reading = digitalRead(pin);
  
  if (reading != lastSensorState[index]) {
    lastDebounceTime[index] = millis();
  }

  if ((millis() - lastDebounceTime[index]) > DEBOUNCE_DELAY) {
     // Stable state logic if needed
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
  if (reading == LOW) { // Car at entrance
     // Trigger Camera
     lcd.clear();
     lcd.setCursor(0, 0);
     lcd.print("Car Detected");
     lcd.setCursor(0, 1);
     lcd.print("Scanning...");
     
     String json = "{\"type\":\"CAMERA_TRIGGER\", \"stationId\": " + String(STATION_ID) + "}";
     webSocket.sendTXT(json);
     
     delay(3000); // Wait a bit to avoid spam and let user read "Scanning"
     if (!isGateOpen) resetLCD(); // Reset if gate didn't open
  }
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

void openGate(String userName) {
  Serial.println("Opening Gate");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Welcome");
  lcd.setCursor(0, 1);
  if (userName.length() > 0) {
    lcd.print(userName.substring(0, 16)); // Truncate to 16 chars
  } else {
    lcd.print("Authorized");
  }
  
  gateServo.write(90); // Open position
  isGateOpen = true;
  gateOpenTime = millis();
}

void denyAccess() {
  Serial.println("Access Denied");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Access Denied");
  lcd.setCursor(0, 1);
  lcd.print("Not Booked");
  delay(3000);
  resetLCD();
}

void closeGate() {
  Serial.println("Closing Gate");
  gateServo.write(0); // Closed position
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
      
      // Simple parsing
      if (msg.indexOf("GATE_OPEN") >= 0) {
        // Extract name if possible, for now just generic
        // In a real JSON parser we'd get the "name" field
        // Hacky extraction for demo:
        String name = "";
        int nameIdx = msg.indexOf("\"name\":\"");
        if (nameIdx > 0) {
           int endIdx = msg.indexOf("\"", nameIdx + 8);
           name = msg.substring(nameIdx + 8, endIdx);
        }
        openGate(name);
      } else if (msg.indexOf("GATE_DENIED") >= 0) {
        denyAccess();
      }
      break;
  }
}
