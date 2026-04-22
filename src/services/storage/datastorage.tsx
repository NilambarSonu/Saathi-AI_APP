import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@agni_soil_records';
const CHAT_STORAGE_KEY = '@agni_chat_history';

export interface SoilData {
  temp: number;
  moisture: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  conductivity: number;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  }
}

export interface SoilTestRecord {
  id: string;
  data: SoilData;
  dateSaved: string;
}

export const saveSoilRecord = async (soilData: SoilData): Promise<boolean> => {
  try {
    const existingData = await AsyncStorage.getItem(STORAGE_KEY);
    const records: SoilTestRecord[] = existingData ? JSON.parse(existingData) : [];

    const newRecord: SoilTestRecord = {
      id: `RE-${Date.now()}`,
      data: soilData,
      dateSaved: new Date().toISOString(),
    };

    const updatedRecords = [newRecord, ...records];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecords));
    
    return true;
  } catch (error) {
    console.error("Database Save Error:", error);
    return false;
  }
};

export const getAllSoilRecords = async (): Promise<SoilTestRecord[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Database Get All Error:", error);
    return [];
  }
};

export const getSoilRecordById = async (id: string): Promise<SoilTestRecord | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return null;

    const records: SoilTestRecord[] = JSON.parse(data);
    const found = records.find((record) => record.id === id);
    
    return found || null;
  } catch (error) {
    console.error("Database Get By ID Error:", error);
    return null;
  }
};

export const deleteSoilRecordById = async (id: string): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return false;

    const records: SoilTestRecord[] = JSON.parse(data);

    // 2. Create a new list excluding the one with the target ID
    const filteredRecords = records.filter((record) => record.id !== id);

    // 3. Save the new list back to storage
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredRecords));
    
    console.log(`🗑️ Record ${id} deleted successfully.`);
    return true;
  } catch (error) {
    console.error("❌ Database Delete Error:", error);
    return false;
  }
};

export const clearAllRecords = async () => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};

export interface ChatMessage {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: string;
}

// SAVE Chat
export const saveChatMessage = async (message: ChatMessage) => {
  try {
    const existing = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
    const history = existing ? JSON.parse(existing) : [];
    const updated = [...history, message];
    await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Chat Save Error", e);
  }
};

// GET Chat History
export const getChatHistory = async (): Promise<ChatMessage[]> => {
  try {
    const data = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const clearChatHistory = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(CHAT_STORAGE_KEY);
    console.log("🧹 Chat history cleared.");
    return true;
  } catch (e) {
    console.error("❌ Failed to clear chat history", e);
    return false;
  }
};


