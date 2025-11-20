// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyCtWOjZbNePeZHb_Ih_nRfpdKb6N5Il86c",
  authDomain: "simpligest-17084.firebaseapp.com",
  projectId: "simpligest-17084",
  storageBucket: "simpligest-17084.firebasestorage.app",
  messagingSenderId: "10518317357",
  appId: "1:10518317357:web:975bdbebd2552762f0eba4",
};

// Inicializar Firebase
export const firebaseApp = initializeApp(firebaseConfig);

// Exportar servicios que usa la app
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

