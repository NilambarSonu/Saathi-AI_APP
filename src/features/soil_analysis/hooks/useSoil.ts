import { useState, useCallback } from 'react';
import { api } from '@/services/api';

export function useSoil() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [recommendations, setRecommendations] = useState<any[] | null>(null);
  const [pricing, setPricing] = useState<any | null>(null);
  const [soilError, setSoilError] = useState<string | null>(null);

  const processSoilData = useCallback(async (rawJson: any) => {
    if (!rawJson) return;
    
    setIsProcessing(true);
    setSoilError(null);
    
    try {
      // Normalize different possible key variants from hardware
      const normalized = {
        timestamp: rawJson.timestamp || new Date().toISOString(),
        deviceId: rawJson.deviceId || 'AGNI-SOIL-SENSOR',
        metrics: {
          nitrogen: rawJson.nitrogen ?? rawJson.N ?? 0,
          phosphorus: rawJson.phosphorus ?? rawJson.P ?? 0,
          potassium: rawJson.potassium ?? rawJson.K ?? 0,
          ph: rawJson.ph ?? rawJson.pH ?? 7.0,
          moisture: rawJson.moisture ?? rawJson.M ?? 0,
          temperature: rawJson.temperature ?? rawJson.T ?? 0,
        }
      };

      // Send to SaaS API Layer
      const response = await api.soilTests(normalized);
      
      if (response.queued) {
        setSoilError('Saved offline. Recommendations will generate when internet is restored.');
        return null; // Signals it was queued
      }

      setRecommendations(response.recommendations || []);
      if (response.pricing) setPricing(response.pricing);
      
      return response;
    } catch (err: any) {
      setSoilError(err.message || 'Failed to process soil analysis via SaaS backend.');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { processSoilData, isProcessing, recommendations, pricing, soilError };
}


