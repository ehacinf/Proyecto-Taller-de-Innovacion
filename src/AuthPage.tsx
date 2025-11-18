// src/AuthPage.tsx
import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "./firebase";

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(
        error?.message || "Ocurrió un error. Revisa tus datos e inténtalo de nuevo."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-softGray flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">SimpliGest</h1>
          <p className="text-xs text-gray-500 mt-1">
            Simple como Excel, potente como un ERP.
          </p>
        </div>

        <div className="flex justify-center gap-2 text-xs bg-softGray rounded-xl p-1">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-lg ${
              isLogin ? "bg-primary text-white" : "text-primary"
            }`}
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-lg ${
              !isLogin ? "bg-primary text-white" : "text-primary"
            }`}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block mb-1 text-gray-600">Correo electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primaryLight/80"
              placeholder="ejemplo@tuempresa.cl"
            />
          </div>

          <div>
            <label className="block mb-1 text-gray-600">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primaryLight/80"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {errorMsg && (
            <p className="text-[11px] text-red-600 bg-red-50 rounded-xl px-3 py-2">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-primary text-white py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition disabled:opacity-60"
          >
            {loading
              ? "Procesando..."
              : isLogin
              ? "Entrar a SimpliGest"
              : "Crear cuenta y entrar"}
          </button>
        </form>

        <p className="text-[11px] text-gray-400 text-center">
          Tu información se almacena de forma segura en la nube 🔐
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
