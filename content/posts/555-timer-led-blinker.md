---
title: 'Blink an LED with a 555 timer'
slug: 555-timer-led-blinker
category: electronics
summary: A 555 in astable mode blinks an LED about 1.5 times a second. Six parts, one breadboard, no code.
date: '2026-10-14'
tags: [555, breadboard, beginner]
status: published
---

This circuit blinks an LED about 1.5 times per second. It uses a 555 timer in astable mode. No microcontroller, no code.

## Parts

| Part | Value | Qty |
|---|---|---|
| Timer IC | NE555 (8-pin DIP) | 1 |
| Resistor R1 | 1 kΩ | 1 |
| Resistor R2 | 47 kΩ | 1 |
| Capacitor C1 | 10 µF electrolytic | 1 |
| LED resistor | 330 Ω | 1 |
| LED | any colour | 1 |
| Supply | 5 V | 1 |

## Wiring

Pin numbers are counted from the notch, anticlockwise.

1. Pin 1 to GND.
2. Pin 8 to +5 V.
3. Pin 4 (reset) to +5 V.
4. R1 between +5 V and pin 7.
5. R2 between pin 7 and pin 6.
6. Join pin 6 to pin 2.
7. C1 from pin 2 to GND. The negative leg goes to GND.
8. Pin 3 to the 330 Ω resistor, then the LED anode. The LED cathode goes to GND.

## The numbers

Blink frequency is `f = 1.44 / ((R1 + 2 × R2) × C)`.

With R1 = 1 kΩ, R2 = 47 kΩ and C = 10 µF, that is 1.44 / (95 000 × 0.00001), which is about 1.5 Hz.

LED current is about (5 V − 2 V) / 330 Ω, so roughly 9 mA. That is safe for a standard LED.

## Takeaway

Frequency depends only on R1, R2 and C1. Double C1 and the blink rate halves.
