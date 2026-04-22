# 🚀 Saathi AI APK - Billion Dollar Architecture

This project follows a **Feature-First / Domain-Driven** architecture designed for massive scalability, clear separation of concerns, and ease of collaboration between team members.

## 📁 Core Directory Structure

### 🌐 `app/` (Expo Router)
The routing layer of the application. Keep these files thin; they should primarily import and render components from `src/screens`.
- `(auth)/`: Login, Register, OTP verification.
- `(app)/`: Main application features (Dashboard, Chat, Settings).
- `(onboarding)/`: Initial user walkthrough.

### 🎨 `assets/`
Centralized repository for all static media.
- `animations/`: Lottie JSON files for high-end UI feedback.
- `fonts/`: Custom brand typography.
- `images/`: PNG/JPG/SVG/WebP assets, including farmer icons.
- `videos/`: High-resolution product and technology demos.

### 🏗️ `src/` (Source Code)

#### 📡 `src/api/`
Infrastructure for network requests. Contains axios instances, global interceptors, and API base configurations.

#### 🧩 `src/components/`
Global, reusable UI components.
- `ui/`: Design system primitives (Buttons, Cards, Modals).
- `navigation/`: Custom tab bars and layout containers.

#### ⚖️ `src/constants/`
Single source of truth for design tokens.
- `Colors.ts`, `Spacing.ts`, `Typography.ts`, `Shadows.ts`.

#### 🧪 `src/features/`
The heart of the application logic, grouped by domain. This prevents "Spaghetti Code" as the project grows.
- `auth/`: User authentication logic.
- `ai_assistant/`: Chatbot integration and message processing.
- `soil_analysis/`: Core product logic for soil data.
- `hardware_ble/`: Bluetooth communication layer for device connectivity.

#### 🖇️ `src/services/`
Cross-cutting infrastructure services.
- `notifications/`: Push notifications and local alerts.
- `storage/`: Local persistence logic (AsyncStorage/MMKV).
- `pdfExport/`: Logic for generating agricultural reports.

#### 🧠 `src/store/`
Global state management using **Zustand**. Lightweight, performant, and dev-tool friendly.

#### 🏷️ `src/types/`
Centralized TypeScript definitions to ensure type safety across the entire codebase.

---

## 🛠️ Best Practices for Developers
1. **Feature Separation**: If it's specific to soil analysis, it goes in `features/soil_analysis`. If it's used everywhere, it goes in `src/components` or `src/utils`.
2. **Assets**: Never use root-level assets. Always place them in the appropriate `assets/` subfolder.
3. **Naming**: Use PascalCase for Components and camelCase for hooks/utilities.
4. **Imports**: Use absolute paths (e.g. `@/components/Button`) where possible (configured in `tsconfig.json`).
