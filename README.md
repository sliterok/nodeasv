Instructions: 
1. Upload sketch to arduino
2. Wire according to scheme
3. Connect arduino to your pc via usb
4. Specify arduino's COM port inside start.js
5. Run `npm i`
6. Run `node start.js`

Wiring scheme:
- Arduino — MAX7219
- A4 — CLK
- A3 — CS 
- A2 — DIN
- GND — GND
- +5V — VCC

Tested on 4 seg. 8x8 MAX7219, Arduino Uno, Windows 10, but should work in any environment.
