import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import type { User } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const googleProvider = new GoogleAuthProvider();

type AuthMode = "login" | "register";

type FormState = {
  email: string;
  password: string;
  confirmPassword: string;
};

const initialFormState: FormState = {
  email: "",
  password: "",
  confirmPassword: "",
};

async function ensureUserDocument(user: User) {
  const userRef = doc(db, "users", user.uid);
  const existing = await getDoc(userRef);
  if (!existing.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? "",
      createdAt: serverTimestamp(),
    });
  }
}

function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (mode === "register" && formState.password !== formState.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      setLoading(true);
      if (mode === "register") {
        const credential = await createUserWithEmailAndPassword(
          auth,
          formState.email,
          formState.password
        );
        await ensureUserDocument(credential.user);
      } else {
        await signInWithEmailAndPassword(auth, formState.email, formState.password);
      }
      setFormState(initialFormState);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ha ocurrido un error inesperado");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      setLoading(true);
      const credential = await signInWithPopup(auth, googleProvider);
      await ensureUserDocument(credential.user);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ha ocurrido un error inesperado");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="flex justify-between mb-6">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-2 font-semibold border-b-2 transition ${
              mode === "login" ? "border-primary text-primary" : "border-transparent text-gray-500"
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 py-2 font-semibold border-b-2 transition ${
              mode === "register"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500"
            }`}
          >
            Registrarse
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formState.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/60"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formState.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/60"
              placeholder="••••••••"
            />
          </div>

          {mode === "register" && (
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="confirmPassword"
              >
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formState.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/60"
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-60"
          >
            {loading ? "Procesando..." : mode === "login" ? "Iniciar sesión" : "Registrarse"}
          </button>
        </form>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 py-2 rounded-xl hover:bg-gray-50 transition disabled:opacity-60"
          >
            <span>Continuar con Google</span>
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-500 text-center">{error}</p>}
      </div>
    </div>
  );
}

export default AuthPage;
