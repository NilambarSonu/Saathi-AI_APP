# CLAUDE CODE PROMPT — ConnectScreen UI Cleanup + AI Chat Message Fix

## CONTEXT
The BLE data transfer is now working perfectly (all farmland JSON files receive correctly).
Now fix the UI in two places:
1. **ConnectScreen** — remove unnecessary sections, clean up the file list UI
2. **AI Chat Screen** — fix the ugly raw JSON message format when analyzing a file

---

## PART 1 — ConnectScreen UI Changes

### REMOVE these completely:
- The tab switcher row ("Soil Data" / "Quick Start" pills/tabs)
- The "Live Soil Reading" card section (pH Level, Moisture, Temperature, Nitrogen, Phosphorus, Potassium, Conductivity — all 0.0 cards)
- The "Send to AI Pipeline" button

### KEEP these exactly as they are:
- The top header ("Live Connect", "Pair With Your Agni Soil Sensor", "• Connected" badge)
- The Bluetooth animation circle in center
- The connection status text below animation
- The "Connected — Ready" green button (or "Scan for Agni Device" when idle)
- The "Disconnect" link
- The "Simulate Agni Protocol" debug link (__DEV__ only)
- The Session Log panel at bottom

### REDESIGN — "Received Soil Reports" section

Replace the current file list with this clean, minimal design:

```
┌─────────────────────────────────────────┐
│  Received Soil Reports          (count) │
├─────────────────────────────────────────┤
│  📄 farmland_1.json          👁  ✈️    │
│  📄 farmland_2.json          👁  ✈️    │
│  📄 farmland_3.json          👁  ✈️    │
│  📄 farmland_4.json          👁  ✈️    │
│  📄 farmland_5.json          👁  ✈️    │
│  📄 farmland_6.json          👁  ✈️    │
│  📄 farmland_7.json          👁  ✈️    │
└─────────────────────────────────────────┘
```

**Exact specs for the file list:**

```typescript
// Each file row:
<View style={styles.fileRow}>
  {/* Left: file icon + name */}
  <View style={styles.fileLeft}>
    <FileText size={18} color="#6B7280" />  {/* lucide-react-native */}
    <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="tail">
      {file.filename}
    </Text>
  </View>

  {/* Right: icon-only buttons — NO text labels */}
  <View style={styles.fileActions}>
    {/* Eye button — view raw JSON */}
    <TouchableOpacity
      style={styles.iconBtn}
      onPress={() => handleViewFile(file)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Eye size={18} color="#6B7280" />
    </TouchableOpacity>

    {/* Analyze button — send to AI chat */}
    <TouchableOpacity
      style={[styles.iconBtn, styles.analyzeBtn]}
      onPress={() => handleAnalyze(file)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Send size={16} color="#FFFFFF" />
    </TouchableOpacity>
  </View>
</View>
```

**Styles:**
```typescript
const styles = StyleSheet.create({
  // Section container
  reportsSection: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Section header row
  reportsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  reportsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  reportsBadge: {
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  reportsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },

  // Each file row
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  fileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  fileName: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },

  // Action buttons
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeBtn: {
    backgroundColor: '#7C3AED',  // purple to match app theme
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});
```

**Empty state (when no files received yet):**
```typescript
{receivedFiles.length === 0 && (
  <View style={styles.emptyState}>
    <FolderOpen size={36} color="#D1D5DB" />
    <Text style={styles.emptyText}>
      Connect to your Agni device{'\n'}to receive soil reports
    </Text>
  </View>
)}
```

**File viewer modal (eye button):**
```typescript
// Simple bottom sheet or Modal showing formatted JSON
<Modal visible={viewModalVisible} transparent animationType="slide">
  <View style={styles.modalOverlay}>
    <View style={styles.modalSheet}>
      {/* Header */}
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{selectedFile?.filename}</Text>
        <TouchableOpacity onPress={() => setViewModalVisible(false)}>
          <X size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
      {/* JSON content */}
      <ScrollView style={styles.modalScroll}>
        <Text style={styles.jsonText}>
          {selectedFile ? JSON.stringify(JSON.parse(selectedFile.content), null, 2) : ''}
        </Text>
      </ScrollView>
    </View>
  </View>
</Modal>

// Modal styles
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'flex-end',
},
modalSheet: {
  backgroundColor: '#1F2937',  // dark background for JSON viewer
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  maxHeight: '70%',
  paddingBottom: 40,
},
modalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#374151',
},
modalTitle: {
  color: '#F9FAFB',
  fontSize: 14,
  fontWeight: '600',
},
modalScroll: {
  padding: 16,
},
jsonText: {
  color: '#86EFAC',   // green monospace text like a terminal
  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  fontSize: 12,
  lineHeight: 18,
},
```

**Icons to use (from lucide-react-native):**
```typescript
import { FileText, Eye, Send, FolderOpen, X } from 'lucide-react-native';
```

---

## PART 2 — AI Chat Screen: Fix Analyze Message Format

### Current behavior (ugly — fix this):
When user taps Analyze on `farmland_1.json`, the chat shows:
```
User: "I just connected my Agni sensor and received farmland_1.json. 
Please analyze this soil data: {"id":1,"timestamp":"2026-03-11T03:16:41Z",
"time_utc":"03:16:41","date_ist":"2026-03-11","time_ist":"08:46 AM",
"location":{"latitude":21.41084,"longitude":86.75122,...},...}"
```
This is raw JSON dumped as visible chat text — ugly and unreadable.

### Required behavior (match the website):
The website shows a clean green file card bubble for the user message, 
with just the filename shown — the JSON data is sent to the AI as context 
but the user sees a clean card, not raw JSON.

**Fix the handleAnalyze function and the chat message rendering:**

#### Step 1 — Change what gets sent as the visible message

In `handleAnalyze(file)`, navigate to chat with structured params:
```typescript
const handleAnalyze = (file: ReceivedFile) => {
  try {
    const soilData = JSON.parse(file.content);
    
    // Navigate to AI Chat with structured data
    // The filename is shown in UI, the JSON is sent as AI context only
    navigation.navigate('Chat', {
      soilFileAttachment: {
        filename: file.filename,
        data: soilData,           // full parsed JSON for AI
        displayName: file.filename // what user sees in bubble
      }
    });
  } catch (error) {
    Alert.alert('Error', 'This file contains invalid data and cannot be analyzed.');
  }
};
```

#### Step 2 — In the Chat Screen, render a file attachment bubble

When `route.params?.soilFileAttachment` exists, show a file card bubble 
instead of a text message bubble:

```typescript
// In ChatScreen, detect the incoming soil file attachment
useEffect(() => {
  const attachment = route.params?.soilFileAttachment;
  if (attachment) {
    // Add a "user message" that renders as a file card, not text
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      type: 'file_attachment',           // new type — renders as card
      filename: attachment.filename,
      content: '',                       // empty — not shown as text
      soilData: attachment.data,         // stored for AI context
      timestamp: new Date(),
    };
    
    // Add to messages
    setMessages(prev => [...prev, userMessage]);
    
    // Send to AI with structured prompt (NOT visible to user)
    const aiPrompt = buildSoilAnalysisPrompt(attachment.filename, attachment.data);
    sendToAI(aiPrompt);
  }
}, [route.params?.soilFileAttachment]);
```

#### Step 3 — Build a clean AI prompt (not shown to user)

```typescript
const buildSoilAnalysisPrompt = (filename: string, data: any): string => {
  // Extract key soil parameters
  const params = data.parameters || data;
  const ph = params.ph_value ?? params.pH ?? params.ph ?? 'N/A';
  const nitrogen = params.nitrogen ?? params.N ?? 'N/A';
  const phosphorus = params.phosphorus ?? params.P ?? 'N/A';
  const potassium = params.potassium ?? params.K ?? 'N/A';
  const moisture = params.moisture ?? 'N/A';
  const temperature = params.temperature ?? 'N/A';
  const ec = params.conductivity ?? params.EC ?? params.ec ?? 'N/A';
  const location = data.location;
  const timestamp = data.timestamp ?? data.date_ist ?? '';

  return `Analyze this soil test report from ${filename}:

Soil Parameters:
- pH: ${ph}
- Nitrogen (N): ${nitrogen} mg/kg  
- Phosphorus (P): ${phosphorus} mg/kg
- Potassium (K): ${potassium} mg/kg
- Moisture: ${moisture}%
- Temperature: ${temperature}°C
- Electrical Conductivity: ${ec} dS/m
${location ? `- GPS: ${location.latitude?.toFixed(4)}, ${location.longitude?.toFixed(4)}` : ''}
${timestamp ? `- Test Date: ${timestamp}` : ''}

Please provide:
1. Overall soil health assessment
2. Key issues or deficiencies found
3. Specific fertilizer recommendations (type and quantity per acre)
4. Best crops suitable for these conditions
5. Actionable next steps for the farmer`;
};
```

#### Step 4 — Render the file attachment bubble in the message list

```typescript
// In your message FlatList renderItem:
const renderMessage = ({ item }: { item: ChatMessage }) => {
  
  // File attachment bubble (user side)
  if (item.type === 'file_attachment') {
    return (
      <View style={styles.userMessageContainer}>
        <View style={styles.fileAttachmentBubble}>
          {/* Green file card — matches website look */}
          <View style={styles.fileCard}>
            <FileText size={20} color="#FFFFFF" />
            <Text style={styles.fileCardName} numberOfLines={1}>
              {item.filename}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Regular text message bubble (existing code)
  if (item.role === 'user') {
    return (
      <View style={styles.userMessageContainer}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{item.content}</Text>
        </View>
      </View>
    );
  }

  // AI response bubble (existing code)
  return (
    <View style={styles.aiBubbleContainer}>
      <View style={styles.aiBubble}>
        <Text style={styles.aiText}>{item.content}</Text>
      </View>
    </View>
  );
};

// Styles for file attachment bubble:
fileAttachmentBubble: {
  alignSelf: 'flex-end',
  maxWidth: '60%',
},
fileCard: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#16A34A',   // green — matches website
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  gap: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 4,
  elevation: 3,
},
fileCardName: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '600',
  flex: 1,
},
```

---

## FINAL RESULT — What the screens should look like

### ConnectScreen (after fix):
```
Live Connect                    • Connected
Pair With Your Agni Soil Sensor

        [Bluetooth Animation Circle]
        
        All files received from device!

        [ Connected — Ready ]
           Disconnect

┌─────────────────────────────────┐
│ Received Soil Reports       [7] │
├─────────────────────────────────┤
│ 📄 farmland_1.json      👁  [✈] │
│ 📄 farmland_2.json      👁  [✈] │
│ 📄 farmland_3.json      👁  [✈] │
│ 📄 farmland_4.json      👁  [✈] │
│ 📄 farmland_5.json      👁  [✈] │
│ 📄 farmland_6.json      👁  [✈] │
│ 📄 farmland_7.json      👁  [✈] │
└─────────────────────────────────┘
```
(No tabs, no soil parameter cards, no Send to AI Pipeline button)

### AI Chat Screen (after fix):
```
                    ┌──────────────────┐
                    │ 📄 farmland_1.json│  ← green file card (user side)
                    └──────────────────┘

🌱 Here is an analysis of your soil data:

   pH (4.7): Strongly acidic soil.
   → Apply 1500–2000 kg/acre agricultural lime

   Nitrogen (335 ppm): Sufficient levels.
   → No extra nitrogen fertilizer needed...

   [continues with structured AI response]
```

---

## IMPORTANT — Do NOT break these working things:
- The BLE scan/connect/file transfer flow (already working perfectly)
- The session log at the bottom
- The Simulate Agni Protocol debug button
- The Disconnect link
- The file data being passed to AI (only the DISPLAY changes, AI still gets full JSON as context)
