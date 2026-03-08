========================================================================
                            doT.dasH_
========================================================================

A premium, single-page Morse code translator built with a mobile-first 
philosophy, fluid animations, and deep hardware integration.

------------------------------------------------------------------------
PROJECT OVERVIEW
------------------------------------------------------------------------
doT.dasH_ is a highly interactive web application designed to translate 
standard text to Morse code and vice versa in real-time. Designed to 
feel like a native mobile app, it utilizes a Single Page Application 
(SPA) architecture, bypassing standard page reloads for a completely 
seamless user experience.

------------------------------------------------------------------------
KEY FEATURES
------------------------------------------------------------------------
* Real-Time Translation Engine: Instantly translates Morse to Text and 
  Text to Morse.
* Single-Page Architecture: The UI smoothly morphs between the 
  Calculator Grid and the Text Keyboard using advanced animations.
* Hardware Feedback: Features precise 600Hz audio beeps (Web Audio API) 
  and dynamic physical haptics (Vibration API).
* Optical Character Recognition (OCR): Uses the device's camera to scan, 
  crop, and instantly translate real-world text into Morse code.
* Interactive Guide: A built-in, tap-to-copy Morse code dictionary 
  with dynamic floating tooltips.
* Data Export: Easily export translation logs to .txt or .csv formats 
  for record-keeping.
* Accessible by Design: Fully compliant with modern accessibility 
  standards, featuring custom focus rings, ARIA labels, and full 
  keyboard navigability.

------------------------------------------------------------------------
TECHNOLOGY STACK
------------------------------------------------------------------------
* Core: HTML5, CSS3 (Custom Properties/Variables), Vanilla JavaScript
* Animations: GSAP (GreenSock Animation Platform)
* Image Cropping: Cropper.js
* OCR / Scanning: Tesseract.js

------------------------------------------------------------------------
LOCAL SETUP & USAGE
------------------------------------------------------------------------
Because this application relies entirely on Vanilla JavaScript and CDN 
libraries, there is no complex build process, compilation, or server 
installation required.

1. Download or clone the repository to your local machine.
2. Open the project folder.
3. Double-click 'index.html' to open it in any modern web browser.

Note: Camera access and Audio/Vibration APIs require a direct user 
interaction (like a click or tap) to unlock due to standard browser 
security policies.

------------------------------------------------------------------------
CUSTOMIZATION (THEMING)
------------------------------------------------------------------------
The entire color palette is controlled by a 3-accent variable system. 
To theme the app, simply open 'globals.css' and modify the hex codes 
under the :root section:
  --accent-1: Primary color
  --accent-2: Action color
  --accent-3: Highlight color

------------------------------------------------------------------------
CREDITS
------------------------------------------------------------------------
Built by sagar-aol
GitHub: https://github.com/sagar-aol
