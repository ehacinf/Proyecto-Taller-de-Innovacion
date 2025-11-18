// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCtWOjZbNePeZHb_Ih_nRfpdKb6N5Il86c",
  authDomain: "simpligest-17084.firebaseapp.com",
  projectId: "simpligest-17084",
  storageBucket: "simpligest-17084.firebasestorage.app",
  messagingSenderId: "10518317357",
  appId: "1:10518317357:web:5a1cfbe03cc34219f0eba4",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios que usa la app
export const auth = getAuth(app);
export const db = getFirestore(app);

