# Saathi AI Native App - Feature Parity & Enhancements Plan

Based on the analysis of the `saathiai.org` web application, the following UI/UX patterns, features, and design tokens must be implemented in the React Native mobile app to ensure exact feature parity with native mobile enhancements.

## 1. Design System & UI/UX Patterns

### Colors & Theming
*   **Primary Core (Saathi Green):** `#1B4332`, `#2D6A4F`, and active states using `#2dc653`.
*   **Accents:** Orange (`#f97316`) for primary action buttons (like "Buy Agni") and warnings; Blue/Cyan (`#0ea5e9`, `#0284c7`) for data visualization and tech indicators.
*   **Backgrounds:** Light mode uses subtle gradients (`from-green-50 to-blue-50`, `bg-orange-50/30`), while dark mode uses deep slates (`slate-800`, `slate-900`) instead of pure black for a softer, premium feel.
*   **Glassmorphism:** Widespread use of `bg-white/70`, `backdrop-blur-md` on cards and floating components. Mobile equivalent: use transparent backgrounds with blur views (`expo-blur`).

### Typography & Layout
*   Clear, bold headings with gradient text (e.g., `from-green-600 via-blue-600 to-purple-600 bg-clip-text`).
*   Consistent card usage with rounded corners (`rounded-xl` or `rounded-2xl`), subtle borders, and soft shadows.

### Animations
*   The web uses `framer-motion` heavily for layout transitions, and Lottie for empty states (e.g., history trend animation).
*   **Mobile adaptation:** Use `react-native-reanimated` for layout transitions and `lottie-react-native` for the exact same JSON animations.

---

## 2. Page-by-Page Feature Parity Plan

### 1. Home / Dashboard (`/`)
*   **Status Indicators:** Need prominent connection status (Bluetooth/Server).
*   **Stat Pills:** Glassmorphism stat cards summarizing total scans, field health, etc.
*   **Awards Ticker / News:** Maintain the ticker for credibility.
*   **Quick Actions:** Big, accessible buttons to "Start Scanning", "Ask AI".

### 2. Live Connect (`/connect`)
*   *Critical Mobile Enhancement:* Web uses Web Bluetooth API. App MUST use robust native BLE (`react-native-ble-plx` or `react-native-ble-manager`).
*   **Features:** Scanning states (radar animation), pairing, live data feed (NPK, pH, Moisture, Temp), and calibration workflows.
*   **Offline Mode:** Enhance native caching so readings are saved locally and synced later.

### 3. Interactive Map & History (`/history`)
*   **Map (Done):** Use `react-native-maps` with color-coded markers (Red=Acidic, Green=Neutral, Blue=Alkaline). Replace floating info windows with `@gorhom/bottom-sheet` (Done).
*   **Trend Charts:** Web uses Recharts. App needs a native charting library (e.g., `react-native-gifted-charts`) for Bar and Line trend analysis.
*   **Data Table:** Convert the test history log into swipeable or expandable list cards.
*   **Export:** Integrate native PDF and CSV generation and sharing using `expo-sharing` and `expo-print`.

### 4. AI Chat & Chat History (`/chat`, `/chat-history`)
*   **Chat Interface:** Markdown rendering for AI responses (`react-native-markdown-display`).
*   **Dictation & TTS:** Web uses Web Speech API. Mobile must integrate with iOS/Android native speech recognition and TTS (e.g., `expo-speech`, `react-native-voice`).
*   **Chat History:** A dedicated screen to list previous conversation sessions with date, preview text, message count, and language. Users should be able to resume or delete sessions.

### 5. Profile & Settings (`/account`, `/settings`)
*   **Account:** Display dynamic avatar, account age, editable Name and Location, read-only Email/Phone.
*   **Settings:** 
    *   Dark Mode Toggle, Compact Mode Toggle.
    *   Language Selection (support for broader Indic languages: en, hi, mr, te, ta, kn).
    *   Auto-Sync toggle.
    *   Data Export and Account Deletion flows.
    *   AI-Powered Pricing toggle.

### 6. E-Commerce / Buy Agni (`/buy-agni`)
*   **Product Gallery:** Swipeable image/video gallery with zoom hints. Mobile needs gesture-handler integration for smooth swiping and pinch-to-zoom.
*   **Pricing Block:** Clear display of original price, discount, and taxes.
*   **Features & Specs:** Bullet points, trust badges (Warranty, Free Delivery), and a collapsible Tech Specs table.
*   **Reviews:** List of customer testimonials with star ratings.
*   **Floating Buy Button:** Ensure the "Buy Now" button sticks to the bottom on mobile for high conversion.

### 7. About Us (`/about`)
*   Mission statement, Team cards with photos, and a Contact Form (Name, Email, Message submitting to API).

---

## 3. Recommended Approach for Implementation

1.  **Architecture:** Maintain a central state store (Zustand or Redux) to manage User data, Settings, and Bluetooth connection state globally.
2.  **Navigation Flow:** Enhance the bottom tab navigator. Add Stack navigators to handle deep links like `Chat -> Chat History` or `Account -> Settings`.
3.  **API Layer:** Re-use web's fetch/TanStack query logic with mobile-specific offline persistence (`react-query-persist-client` with Async Storage) for poor field networks.
4.  **Hardware UI:** The mobile app should provide better haptic feedback (using `expo-haptics`) than the web during device pairing and scan completions.
