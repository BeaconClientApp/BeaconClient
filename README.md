# Beacon Client (Alpha) 📱

An unofficial, modern, mobile-first chat client for F-List, built with React Native and Expo. 

Beacon Client was designed from the ground up to address the need for stable chat on mobile devices.

## ✨ Features

* **True Background Persistence:** Keeps your chat session alive while minimized (bypassing aggressive battery optimizations from manufacturers like Samsung).
* **Modern UI/UX:** A clean, dark-themed interface built specifically for mobile devices.
* **Full BBCode Support:** Renders rich text, user colors, inline icons (`[icon]`, `[eicon]`), and spoilers perfectly.
* **Smart Logs Manager:** Locally saves your private messages and room chats, accessible via a built-in Logs Viewer.
* **Custom Notification Engine:** Highlight words, username mentions, and haptic feedback alerts.
* **Modular Architecture:** Built with Zustand for global state management and separate brains for Auth, Chat, and Settings.

## 🛠️ Tech Stack

* **Framework:** [Expo](https://expo.dev/) / React Native
* **Language:** TypeScript
* **State Management:** [Zustand](https://github.com/pmndrs/zustand)
* **Local Storage:** AsyncStorage
* **Background Tasks:** Notifee

## 🚀 Getting Started (Development)

To run this project locally, you will need [Node.js](https://nodejs.org/) and the [Expo CLI](https://docs.expo.dev/get-started/installation/) installed.

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/BeaconClientApp/BeaconClient](https://github.com/BeaconClientApp/BeaconClient)
   cd BeaconClient

2. **Install dependencies:**
   ```bash
   npm install

3. **Start the Expo server:**
   ```bash
   npx expo start

4. **Open the app on your physical device using the Expo Go app, or press a to run it on an Android Emulator.**

## 📄 License
This project is licensed under the Mozilla Public License Version 2.0 (MPL-2.0).
See the LICENSE file for more details.

This means you are free to use, modify, and distribute this code. However, if you modify any existing files, you must make those modifications available under the same MPL-2.0 license.

## ⚠️ Disclaimer
Beacon Client is an unofficial, community-driven project. It is not affiliated with, endorsed by, or officially connected to F-List or its staff. This application uses the public F-List API and WebSocket infrastructure. Please ensure you comply with the platform's Terms of Service while using this client.