# SyncScreen: Event Trailer Countdown

A synchronized, multi-device countdown app designed for live events. 

Audiences scan a QR code to see a live timer on their phones (using mobile data or Wi-Fi), while an operator controls the start from a secure, PIN-protected panel. At zero, a video plays locally on the main projector laptop (ensuring zero buffering), while audience phones display a "Look at the screen" prompt.

## How It Works
- **`server.js`**: A zero-dependency Node.js server that holds the single source of truth (the target time).
- **Clock Sync**: Phones and laptops sync their clocks to the server every few seconds, ensuring every device shows the exact same second.
- **Server-Sent Events (SSE)**: The server pushes the start signal to all connected devices instantly. 
- **Local Playback**: The video is never uploaded. It is loaded directly from the projector laptop's hard drive.

## Features
- **Operator Panel (`/operator`)**: PIN-protected controls (Start, Cancel, +30s, -30s).
- **Main Screen (`/screen`)**: Automatically plays the local video file at zero. Features a red warning pulse and synthesized audio ticking in the final 10 seconds to build tension.
- **Audience Phones (`/`)**: Shows the live minutes/seconds in a premium glass-box UI. Does not play the video.
- **QR Poster (`/qr`)**: Generates a printable QR code that links directly to the audience view.
- **Offline Backup**: Press `S` on the `/screen` page to trigger a local 30-second countdown that doesn't require the internet.

## Local Development
If you want to run this locally on your machine:
1. Ensure you have Node.js 18+ installed.
2. Run `node server.js` in the terminal.
3. Open `http://localhost:3000/operator` to access the panel.
   *(Note: To let phones on the same network connect, use your laptop's local IPv4 address, e.g., `http://192.168.1.50:3000`).*

## Deployment (Render)
This app is designed to be hosted on [Render](https://render.com) so phones on mobile data can reach it.
1. Connect this GitHub repository to a new Render Web Service.
2. **Runtime:** Node
3. **Build Command:** (leave blank)
4. **Start Command:** `node server.js`
5. **Environment Variables:** Add `OPERATOR_PIN` and set it to your chosen 4-digit PIN.
6. **Region:** Choose the region closest to your event location.

### ⚠️ Render Free Tier Note
Render's free tier puts the server to sleep after 15 minutes of inactivity. If it is asleep, it takes about 50 seconds to wake up. 
**Before the event starts:** Open `https://[your-render-url]/api/state` in a browser and wait for it to load. Leave the tab open to keep the server awake.

## The Event Flow
1. **15 mins before start:** Wake the server, arm the screen on the laptop, and open the operator panel on your phone.
2. **Display the QR:** Show the `/qr` page at the entrance. Attendees scan it.
3. **Start:** Press **Start** on your phone. All phones and the main screen will count down together.
4. **At Zero:** The trailer plays on the laptop. Phones say "Look up!".
