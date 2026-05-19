export interface BluetoothSoilData {
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  moisture: number;
  temperature: number;
  ec: number;
  timestamp: string;
  rawBluetoothData?: any;
  location?: {
    latitude: number;
    longitude: number;
  };
  deviceId?: string;
}

export type BLEConnectionStatus = 
  | 'idle' 
  | 'scanning' 
  | 'connecting' 
  | 'connected' 
  | 'transferring' 
  | 'complete' 
  | 'error'
  | 'bluetooth_off'
  | 'activating_bluetooth'
  | 'permission_denied';

export interface ConnectionStatus {
  status: BLEConnectionStatus;
  message: string;
  subMessage: string;
  progress?: number;
  deviceName?: string;
}

export interface ReceivedFile {
  filename: string;
  content: string; // decoded UTF-8 JSON string
}
