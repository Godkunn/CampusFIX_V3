import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { Capacitor } from '@capacitor/core';

export default function useCachedData(endpoint, cacheKey) {
  const isNative = Capacitor.isNativePlatform(); // 📱 Check if we are on Android/iOS

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (manual = false) => {
    // 1️⃣ APP ONLY: Load from cache instantly
    if (isNative && !manual) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setData(JSON.parse(cached));
        setLoading(false); // Show UI immediately
      }
    }

    if (manual) setLoading(true);

    try {
      // 2️⃣ NETWORK: Fetch fresh data
      const res = await api.get(endpoint);
      setData(res.data);

      // 3️⃣ APP ONLY: Save to cache
      if (isNative) {
        localStorage.setItem(cacheKey, JSON.stringify(res.data));
      }
    } catch (err) {
      // 🚨 Error Handling Fix
      if (!isNative) {
        // On Website: Let the component handle the error (show toast etc)
        throw err; 
      } else {
        // On App: If we have NO data (first install + offline), we must alert
        const cached = localStorage.getItem(cacheKey);
        if (!cached) {
            console.error("App Offline & No Cache");
            // You might want to handle this gracefully in the UI
        }
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, cacheKey, isNative]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refetch: () => fetchData(true) };
}