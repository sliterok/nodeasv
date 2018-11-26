#define DIN 16
#define CS  17
#define CLK 18
#define max7219_reg_decodeMode  0x09
#define max7219_reg_intensity   0x0a
#define max7219_reg_scanLimit   0x0b
#define max7219_reg_shutdown    0x0c
#define max7219_reg_displayTest 0x0f

void setCommand(byte command, byte value)
{
  digitalWrite(CS, LOW);
  for (int i = 0; i < 4; i++)   {
    shiftOut(DIN, CLK, MSBFIRST, command);
    shiftOut(DIN, CLK, MSBFIRST, value);
  }
  digitalWrite(CS, HIGH);
}


void setDisplay(byte command, byte* value)
{
  digitalWrite(CS, LOW);
  for (int i = 0; i < 4; i++)   {
    shiftOut(DIN, CLK, MSBFIRST, command);
    shiftOut(DIN, CLK, MSBFIRST, value[i]);
  }
  digitalWrite(CS, HIGH);
}

void initLed()
{
  setCommand(max7219_reg_scanLimit, 0x07);
  setCommand(max7219_reg_decodeMode, 0x00);
  setCommand(max7219_reg_shutdown, 0x01);
  setCommand(max7219_reg_displayTest, 0x00);
  setCommand(max7219_reg_intensity, 0x00);
}

void setup() {
  pinMode(DIN, OUTPUT); 
  pinMode(CS, OUTPUT);
  pinMode(CLK, OUTPUT);
  digitalWrite(CS, HIGH);
  
  initLed();

  Serial.begin(44800);
}

unsigned long lastSignal = 0;

void loop() {
    if(Serial.available() > 34){
      if(Serial.read() != 0xAA)
        return;
      if(Serial.read() != 0xAA)
        return;

      lastSignal = micros();
      
      for(int i = 0; i < 8; i++){
        byte quadByte[4];
        
        for(int j = 0; j < 4; j++){
          byte incomingByte = 0;
          if(Serial.available() > 0) {
            incomingByte = Serial.read();
          }
          quadByte[j] = incomingByte;
        }  
        setDisplay(i + 1, quadByte);
      }
      
      setCommand(max7219_reg_intensity, Serial.read());
    } else if(micros() - lastSignal > 5000000) {
      byte zeroQuad[4] = {0, 0, 0, 0};
      for(int i = 0; i < 8; i++){
        setDisplay(i + 1, zeroQuad);
      }
    }
    Serial.flush();
}
