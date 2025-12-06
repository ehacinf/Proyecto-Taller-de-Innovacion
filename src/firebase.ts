// src/firebase.ts
import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const getEnvVariable = (key: keyof ImportMetaEnv): string => {
  const value = import.meta.env[key];

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value as string;
};

export const firebaseConfig: FirebaseOptions = {
  apiKey: getEnvVariable("VITE_FIREBASE_API_KEY"),
  authDomain: getEnvVariable("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnvVariable("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnvVariable("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnvVariable("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnvVariable("VITE_FIREBASE_APP_ID"),
};

// Inicializar Firebase
export const firebaseApp = initializeApp(firebaseConfig);

// Exportar servicios que usa la app
export const auth = getAuth(firebaseApp);
export const db = initializeFirestore(firebaseApp, {
  // Habilita caché y long-polling automático para evitar fallas de red
  experimentalAutoDetectLongPolling: true,
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

