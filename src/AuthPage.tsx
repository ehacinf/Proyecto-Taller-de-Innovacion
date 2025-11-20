import { useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

type AuthMode = "register" | "login";

type RegisterForm = {
  nombre: string;
  negocio: string;
  tamano: string;
  email: string;
  password: string;
};

const initialFormState: RegisterForm = {
  nombre: "",
  negocio: "",
  tamano: "1-5 colaboradores",
  email: "",
  password: "",
};

const AuthPage = () => {
  const [mode, setMode] = useState<AuthMode>("register");
  const [form, setForm] = useState<RegisterForm>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const heroBenefits = useMemo(
    () => [
      {
        title: "Inventario inteligente",
        description:
          "Alertas de stock crítico y recomendaciones automáticas para comprar a tiempo.",
      },
      {
        title: "Finanzas claras",
        description:
          "Conecta ventas, compras y flujo de caja para saber exactamente cómo va tu negocio.",
      },
      {
        title: "IA como copiloto",
        description:
          "Predicciones de demanda, sugerencias de precios y respuestas automáticas a tus dudas.",
      },
    ],
    []
  );

  const registrationSteps = useMemo(
    () => [
      {
        number: "01",
        title: "Completa tus datos",
        description: "Cuéntanos sobre tu negocio para personalizar el onboarding.",
      },
      {
        number: "02",
        title: "Recibe la demo guiada",
        description: "Un asesor te mostrará cómo usar SimpliGest en menos de 20 minutos.",
      },
      {
        number: "03",
        title: "Activa tu cuenta",
        description: "Migra tu inventario, configura permisos y comienza a vender sin fricción.",
      },
    ],
    []
  );

  const isLogin = mode === "login";

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMsg(null);
    setResetMessage(null);

    try {
      if (isLogin) {
        const credential = await signInWithEmailAndPassword(
          auth,
          form.email,
          form.password
        );
        console.log("Usuario autenticado:", credential.user);
        return;
      }

      const credential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      await setDoc(
        doc(db, "users", credential.user.uid),
        {
          nombre: form.nombre,
          negocio: form.negocio,
          tamano: form.tamano,
          email: form.email,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error: unknown) {
      console.error("Error en autenticación", error);
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error. Revisa tus datos e inténtalo de nuevo.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset() {
    if (!form.email) {
      setErrorMsg("Ingresa tu correo para recuperar la contraseña");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, form.email);
      setResetMessage("Revisa tu correo para restablecer la contraseña");
      setErrorMsg(null);
    } catch (error: unknown) {
      console.error("Error enviando correo de recuperación", error);
      const message =
        error instanceof Error
          ? error.message
          : "No pudimos enviar el correo de recuperación";
      setErrorMsg(message);
    }
  }

  function toggleMode(nextMode: AuthMode) {
    setMode(nextMode);
    setForm(initialFormState);
    setErrorMsg(null);
    setResetMessage(null);
  }

  return (
    <div className="min-h-screen bg-softGray px-4 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primaryLight text-white p-6 md:p-10 shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
            <div className="lg:col-span-3 space-y-4">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/80 bg-white/10 border border-white/20 px-4 py-1 rounded-full">
                Lanzamiento beta · Cupos limitados
              </span>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                Gestiona inventario, ventas y finanzas en una sola pantalla.
              </h1>
              <p className="text-sm md:text-base text-white/90 max-w-2xl">
                SimpliGest automatiza los procesos aburridos para que te concentres en vender. Regístrate y recibe una demo privada con un asesor especializado en retail, gastronomía o servicios.
              </p>
              <ul className="space-y-2 text-sm text-white/90">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-white"></span>
                  Migramos tus planillas de Excel sin costo adicional.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-white"></span>
                  Capacitación 1 a 1 para tu equipo en menos de una semana.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-white"></span>
                  IA integrada para detectar quiebres de stock y márgenes negativos.
                </li>
              </ul>

              <div className="flex flex-wrap gap-3 pt-4">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-4">
                  <p className="text-3xl font-semibold">8.000+</p>
                  <p className="text-xs text-white/80">Productos gestionados durante la beta.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-4">
                  <p className="text-3xl font-semibold">98%</p>
                  <p className="text-xs text-white/80">Usuarios recomiendan SimpliGest.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button className="bg-white text-primary font-semibold px-6 py-3 rounded-2xl shadow-md hover:opacity-90 transition">
                  Ver producto en vivo
                </button>
                <button className="bg-transparent border border-white/40 px-6 py-3 rounded-2xl text-white/90 text-sm hover:bg-white/10 transition">
                  Descargar brochure
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-2xl text-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-primary">Acceso</p>
                  <h2 className="text-2xl font-semibold text-primary mt-1">
                    {isLogin ? "Inicia sesión" : "Crea tu cuenta"}
                  </h2>
                  <p className="text-gray-500 text-xs">
                    {isLogin
                      ? "Ingresa con tu correo corporativo para continuar."
                      : "Respondemos en menos de 24 horas hábiles."}
                  </p>
                </div>
                <button
                  className="text-xs text-primary underline"
                  onClick={() => toggleMode(isLogin ? "register" : "login")}
                >
                  {isLogin ? "¿Necesitas registrarte?" : "¿Ya tienes cuenta?"}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {!isLogin && (
                  <>
                    <div>
                      <label className="text-gray-600 text-xs block mb-1">
                        Nombre y apellido *
                      </label>
                      <input
                        name="nombre"
                        type="text"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primaryLight/80"
                        placeholder="Camila Torres"
                        value={form.nombre}
                        onChange={handleChange}
                      />
                    </div>
                    <div>
                      <label className="text-gray-600 text-xs block mb-1">
                        Nombre del negocio
                      </label>
                      <input
                        name="negocio"
                        type="text"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200"
                        placeholder="Emporio Central"
                        value={form.negocio}
                        onChange={handleChange}
                      />
                    </div>
                    <div>
                      <label className="text-gray-600 text-xs block mb-1">
                        Tamaño del equipo
                      </label>
                      <select
                        name="tamano"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200"
                        value={form.tamano}
                        onChange={handleChange}
                      >
                        <option value="1-5 colaboradores">1-5 colaboradores</option>
                        <option value="6-20 colaboradores">6-20 colaboradores</option>
                        <option value="21+ colaboradores">21+ colaboradores</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="text-gray-600 text-xs block mb-1">Correo electrónico *</label>
                  <input
                    name="email"
                    type="email"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200"
                    placeholder="tucorreo@empresa.com"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="text-gray-600 text-xs block mb-1">Contraseña *</label>
                  <input
                    name="password"
                    type="password"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                  />
                  {isLogin && (
                    <button
                      type="button"
                      className="text-[11px] text-primary mt-1 underline"
                      onClick={handlePasswordReset}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>

                {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
                {resetMessage && <p className="text-xs text-green-600">{resetMessage}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white py-3 rounded-2xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {loading
                    ? "Procesando..."
                    : isLogin
                    ? "Ingresar"
                    : "Solicitar demo"}
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {heroBenefits.map((benefit) => (
            <div key={benefit.title} className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-primaryLight">
                {benefit.title}
              </p>
              <p className="text-sm text-gray-600">{benefit.description}</p>
            </div>
          ))}
        </section>

        <section className="bg-white rounded-3xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-primary mb-4">
            ¿Cómo funciona SimpliGest?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {registrationSteps.map((step) => (
              <div key={step.number} className="bg-softGray rounded-2xl p-4">
                <p className="text-xs text-primary font-semibold">{step.number}</p>
                <h3 className="font-semibold text-primary">{step.title}</h3>
                <p className="text-gray-600 text-xs">{step.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuthPage;
