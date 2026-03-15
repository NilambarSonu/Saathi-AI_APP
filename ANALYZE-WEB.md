# SAATHI AI — WEB CODEBASE ANALYSIS DIRECTIVE
### For Antigravity IDE · Phase 1 of 2
**Purpose:** Analyze the saathiai.org web codebase deeply, then produce `APP-ENHANCEMENTS.md`  
**You are currently in:** The web project folder (`AgniSaathiAI` or `saathiai.org`)  
**Output required:** One new file called `APP-ENHANCEMENTS.md` in this same folder  

---

## YOUR TASK IN ONE SENTENCE

Read every relevant file in this web project, extract all UI patterns, components, color values, screen layouts, API calls, and functionality — then write `APP-ENHANCEMENTS.md` which tells the native app exactly what to build and how.

---

## STEP 1 — READ THESE FILES FIRST (in this order)

### 1.1 — Project structure scan
```
List all files and folders in the root directory.
Identify: Is this Next.js, Vite+React, or Express+React?
Find: Where is the main router/pages directory?
Find: Where are the React components?
Find: Where is the CSS/styling (Tailwind? CSS Modules? styled-components?)
```

### 1.2 — Read the style foundation
Read these files completely — these define the entire visual system:
- `tailwind.config.js` or `tailwind.config.ts` (if Tailwind)
- `src/index.css` or `client/src/index.css` (global styles)
- Any file named `theme.ts`, `colors.ts`, `tokens.ts`, or `constants.ts`
- `components.json` (if shadcn/ui)

From these, extract and record:
```
PRIMARY_GREEN: (exact hex)
DARK_GREEN: (exact hex)  
ACCENT_AMBER: (exact hex)
BACKGROUND: (exact hex)
CARD_BG: (exact hex)
TEXT_PRIMARY: (exact hex)
TEXT_MUTED: (exact hex)
BORDER_COLOR: (exact hex)
BORDER_RADIUS_CARD: (exact px value)
FONT_FAMILY: (exact font name)
FONT_WEIGHTS_USED: (list all)
SHADOW_CARD: (exact CSS value)
```

### 1.3 — Read every page/screen component
Find and read ALL screen-level components. They are likely in:
- `client/src/pages/` or `src/pages/` or `src/app/`
- Named: `Dashboard.tsx`, `Home.tsx`, `LiveConnect.tsx`, `Chat.tsx`, `History.tsx`, `About.tsx`, `Profile.tsx`, `Login.tsx`, `Register.tsx`, `BuyAgni.tsx`, `Settings.tsx`, `Subscribe.tsx`

For EACH page, record:
```
PAGE: [name]
ROUTE: [URL path]
LAYOUT: [describe the visual layout top to bottom]
KEY_COMPONENTS: [list every sub-component used]
API_CALLS: [list every fetch/apiCall/useQuery used]
STATE: [list useState/useQuery variables]
NAVIGATION: [what does clicking each button do]
SPECIAL_FEATURES: [animations, modals, special behaviors]
```

### 1.4 — Read every reusable component
Find and read ALL files in the `components/` directory recursively.

For EACH component, record:
```
COMPONENT: [filename]
PROPS: [list all props with types]
VISUAL: [what does it look like - colors, layout, typography]
BEHAVIOR: [any interactions, animations, state]
USED_IN: [which pages use this component]
```

### 1.5 — Read the API layer
Find and read:
- `server/routes.ts` or `server/routes/` directory (ALL route files)
- `client/src/lib/api.ts` or `client/src/services/` (frontend API calls)
- `server/storage.ts` or `server/db/` (database queries)

For EACH API endpoint, record:
```
ENDPOINT: POST/GET/PUT/DELETE [path]
AUTH_REQUIRED: yes/no
REQUEST_BODY: [fields]
RESPONSE: [shape of data returned]
USED_BY: [which page/component calls this]
```

### 1.6 — Read the auth system
Find and read:
- Any file with `passport`, `session`, `jwt`, `auth` in the name
- The login/register form components
- Any `useAuth` hook or auth context

Record the complete auth flow from login → dashboard.

### 1.7 — Read the AI Chat implementation
Find the chat page/component. Read it completely. Record:
```
AI_ENDPOINT: [which API endpoint handles chat messages]
SYSTEM_PROMPT: [what system prompt is used if visible]
LANGUAGES: [how is language switching implemented]
VOICE: [how is text-to-speech implemented]
SESSION: [how are chat sessions stored/retrieved]
QUICK_ACTIONS: [what are the 4 quick action cards and what prompts do they send]
```

### 1.8 — Read the History/Analytics implementation
Find the history/analytics page. Read it completely. Record:
```
DATA_SOURCE: [which API endpoint fetches test history]
CHART_LIBRARY: [recharts? chart.js? victory?]
CHART_TYPES: [what charts are used - line, bar, etc]
MAP_LIBRARY: [Leaflet? Google Maps? MapBox?]
MAP_IMPLEMENTATION: [how exactly is the map initialized and populated]
FILTERS: [what filter options exist]
PDF_EXPORT: [how is PDF export implemented]
```

### 1.9 — Read the Dashboard implementation
Find the main dashboard page. Read it completely. Record:
```
HERO_SECTION: [exact layout and content]
STATS_DISPLAYED: [what numbers are shown, where from]
SOIL_HEALTH: [how is health score calculated and displayed]
AGNI_CARD: [exact layout of the connect Agni card]
FEATURE_GRID: [what 4 tiles are shown]
RECENT_TESTS: [how are recent tests fetched and displayed]
AWARDS_TICKER: [what badges scroll, in what order]
```

### 1.10 — Read the About page
Find the About page. Record:
```
SECTIONS: [list all sections top to bottom]
TEAM: [team member names, roles, descriptions]
MISSION: [exact mission text]
TESTIMONIALS: [all testimonial content]
CONTACT: [address, phone, email]
STATS: [any "5+ years", "50+ partners" type stats]
LANGUAGES_SECTION: [how languages are displayed]
```

### 1.11 — Read the Profile/Account page
Find the profile/account page. Record:
```
USER_DATA_SHOWN: [what fields from user object are displayed]
AVATAR: [how is profile picture handled - is there a default? what is it?]
MENU_ITEMS: [list every menu item with its route]
SUBSCRIPTION_DISPLAY: [how is subscription tier shown]
SETTINGS: [what settings are editable inline]
```

### 1.12 — Read the Buy Agni / E-commerce page
Find the product page. Record:
```
PRODUCT_NAME: [exact]
PRICE_CURRENT: [exact ₹ amount]
PRICE_ORIGINAL: [exact ₹ amount with strikethrough]
DISCOUNT_PERCENT: [exact]
MEDIA: [how many images/videos, what asset filenames]
FEATURES_LIST: [all bullet points]
SPECIFICATIONS: [all specs in the table]
BUY_BUTTON: [color, text, payment integration]
REVIEWS: [how reviews are loaded/displayed]
```

### 1.13 — Read the BLE/Connect implementation
Find the Live Connect page and any BLE hooks. Record:
```
BLE_LIBRARY: [which library is used on web - Web Bluetooth API?]
DEVICE_NAME_FILTER: [what device name is scanned for]
DATA_FORMAT: [what JSON structure does Agni send]
PARSING: [how is soil data parsed from raw BLE data]
STATES: [all UI states: idle, scanning, found, connecting, connected, receiving, done, error]
ERROR_MESSAGES: [all possible error messages shown to user]
SOIL_DATA_FIELDS: [all 14+ parameters with their units]
```

### 1.14 — Read the i18n/language system
Find translation files or language switching logic. Record:
```
LANGUAGES: [list all supported language codes and names]
IMPLEMENTATION: [i18next? custom context? how does switching work]
TRANSLATION_FILES: [file paths of all translation JSON files]
AI_LANGUAGE_PROMPT: [how does language choice affect AI responses]
```

---

## STEP 2 — IDENTIFY CRITICAL ISSUES TO FIX IN APP

After reading all files, identify these specific problems noticed in app screenshots:

### Issue A — Founder photo as default avatar
Search for any reference to profile pictures, avatars, or default user images.
Find where the default avatar is set when user has no profile_picture.
Record the exact file and line where this is defined.
**This must use a generic farmer silhouette or initials — never a real person's photo.**

### Issue B — Map not loading  
Search for how the map is initialized in the History/Analytics page on web.
Find the exact MapContainer, TileLayer, and Marker implementation.
Record how it handles the "no GPS data" empty state.
Record the exact Leaflet tile URL used.

### Issue C — Missing charts/graphs
Search for the chart implementation in History.
Find the exact component, data shape, and rendering logic.
Record the recharts (or other library) component structure.

### Issue D — Duplicate section headers in Profile
Search the Profile/Account page for how sections are grouped.
Record the correct section structure with no duplication.

### Issue E — About page missing from app
Read the entire About page component.
Record every section so it can be fully replicated in the app.

### Issue F — Home page "Buy Now" duplicate text
Search for the promotional card on the dashboard that links to Buy Agni.
Record the exact correct text, layout, and content.

---

## STEP 3 — WRITE APP-ENHANCEMENTS.md

After completing all analysis above, create a new file in this folder:  
**Filename:** `APP-ENHANCEMENTS.md`

This file must follow the exact structure below. Fill every section with what you discovered from the web code — use ACTUAL values, ACTUAL colors, ACTUAL text, ACTUAL API endpoints. Do not use placeholders.

```markdown
# SAATHI AI NATIVE APP — ENHANCEMENT PLAN
## Generated by web codebase analysis · [today's date]

### DESIGN TOKENS (extracted from web source)
PRIMARY_GREEN: [actual hex]
DARK_GREEN: [actual hex]
... (all tokens)

### SCREEN 1 — HOME/DASHBOARD
[Complete specification extracted from web Dashboard component]
[Include: exact text, exact layout, exact API calls, exact component structure]
[Special: How to fix the duplicate "Buy Now" bug]
[Special: Correct awards ticker content in correct order]

### SCREEN 2 — LIVE CONNECT
[Complete specification from web LiveConnect component]
[Include: exact BLE device name, exact data format, all 7 UI states]
[Special: BLE crash fix approach for React Native]

### SCREEN 3 — AI CHAT
[Complete specification from web Chat component]
[Include: exact system prompt if found, exact quick action prompts]
[Include: exact language switching mechanism]
[Include: voice/TTS implementation]

### SCREEN 4 — HISTORY/ANALYTICS
[Complete specification from web History component]
[Special: Exact fix for map not loading — tile URL, initialization, empty state]
[Special: Exact chart implementation to replicate in React Native]
[Include: exact data shape from API, filter options, PDF export]

### SCREEN 5 — PROFILE
[Complete specification from web Profile/Account component]
[Special: Default avatar fix — use initials from user.username, NOT any real photo]
[Special: Correct section structure with no duplicate headers]
[Include: all menu items with correct routes]

### SCREEN 6 — ABOUT (MISSING FROM APP — MUST ADD)
[Complete specification from web About component]
[Include: every section, exact team member data, exact mission text]
[Include: testimonials, contact info, language chips]
[Special: Add "About" as 5th tab in bottom navigation]

### SCREEN 7 — AUTH (Login / Register / OTP)
[Confirm auth screens match web — list any differences found]

### SCREEN 8 — BUY AGNI
[Complete specification from web product page]
[Special: Correct price ₹4,699, correct button color orange, correct device image]

### SCREEN 9 — SETTINGS
[Complete specification from web Settings component]
[Include: all toggles, language selector, danger zone]

### SCREEN 10 — SUBSCRIBE
[Complete specification from web Subscription component]
[Include: all 3 plans with exact prices and feature lists]

### API ENDPOINTS USED BY APP
[List every endpoint the app needs, extracted from web frontend code]
[Format: METHOD /path | auth? | request | response]

### NAVIGATION STRUCTURE
[Exact bottom tab configuration]
[5 tabs: Home | Connect | AI Chat | History | About]
[Profile accessible via avatar tap on Home header]

### PACKAGES TO ADD
[List any web libraries that have React Native equivalents needed]
[Example: if web uses recharts, app needs react-native-chart-kit]

### CRITICAL FIXES IN ORDER
1. [Issue A fix — avatar]
2. [Issue B fix — map]
3. [Issue C fix — charts]
4. [Issue D fix — profile sections]
5. [Issue E fix — add About tab]
6. [Issue F fix — dashboard card]
```

---

## STEP 4 — SWITCH TO APP FOLDER AND IMPLEMENT

After `APP-ENHANCEMENTS.md` is written:

1. **Tell the user:** "Web analysis complete. APP-ENHANCEMENTS.md created with [X] screens, [Y] API endpoints, [Z] fixes identified. Please switch the folder to the native app project (saathi-native) so I can begin implementation."

2. **Do NOT start modifying app code yet.** Wait for the user to switch the project folder.

3. **When app folder is switched:** Read `APP-ENHANCEMENTS.md` first, then implement each screen in the order listed, starting with the 6 critical fixes.

---

## RULES FOR THIS ANALYSIS

- **Read actual file contents** — do not assume or guess values
- **Copy exact hex codes** — do not approximate colors
- **Copy exact text strings** — mission statement, team names, testimonials word-for-word
- **Copy exact API endpoint paths** — do not paraphrase routes
- **Note every import** — if a web component uses a specific library, note it
- **Flag anything unclear** — if a file is minified, obfuscated, or uses environment variables you cannot read, note it explicitly in the output
- **Do not modify any web code** — this is read-only analysis

---

*Analysis Directive · Mitti-AI Innovations · saathiai.org*  
*Output: APP-ENHANCEMENTS.md in this folder*
```
