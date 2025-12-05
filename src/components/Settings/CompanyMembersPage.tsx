import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useCompany } from "../../contexts/CompanyContext";
import type {
  CompanyMemberDoc,
  CompanyMemberStatus,
  CompanyRole,
} from "../../models/tenant";

type MemberWithId = CompanyMemberDoc & { id: string };

interface InviteFormState {
  email: string;
  role: CompanyRole;
}

const roleLabels: Record<CompanyRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  seller: "Vendedor",
  stock: "Bodega",
  finance: "Finanzas",
};

export default function CompanyMembersPage() {
  const { currentCompanyId, role, user } = useCompany();
  const [members, setMembers] = useState<MemberWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState<InviteFormState>({
    email: "",
    role: "seller",
  });
  const [submitting, setSubmitting] = useState(false);

  const canManageMembers = useMemo(
    () => role === "owner" || role === "admin",
    [role]
  );

  useEffect(() => {
    if (!currentCompanyId || !canManageMembers) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const membersRef = collection(db, "companies", currentCompanyId, "members");
    const q = query(membersRef);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as CompanyMemberDoc),
        }));
        setMembers(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading members", err);
        setError("No pudimos cargar los miembros de la empresa.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentCompanyId, canManageMembers]);

  if (!currentCompanyId) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4">
        <p className="text-sm text-gray-600">No se ha seleccionado ninguna empresa.</p>
      </div>
    );
  }

  if (!canManageMembers) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="text-lg font-semibold text-primary mb-2">Miembros de la empresa</h3>
        <p className="text-sm text-gray-600">No tienes permisos para gestionar los miembros.</p>
      </div>
    );
  }

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!inviteForm.email) return;
    setSubmitting(true);
    setError(null);

    try {
      const usersQuery = query(
        collection(db, "users"),
        where("email", "==", inviteForm.email.toLowerCase())
      );
      const existingUsers = await getDocs(usersQuery);
      const companyRef = doc(db, "companies", currentCompanyId);
      const membersRef = collection(companyRef, "members");

      if (!existingUsers.empty) {
        const targetUser = existingUsers.docs[0];
        const memberRef = doc(membersRef, targetUser.id);
        await setDoc(
          memberRef,
          {
            userId: targetUser.id,
            email: inviteForm.email.toLowerCase(),
            role: inviteForm.role,
            status: "active",
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        const memberRef = doc(membersRef);
        await setDoc(memberRef, {
          userId: "",
          email: inviteForm.email.toLowerCase(),
          role: inviteForm.role,
          status: "invited",
          createdAt: serverTimestamp(),
        });
      }

      setInviteForm({ email: "", role: "seller" });
    } catch (err) {
      console.error("Error invitando usuario", err);
      setError("No pudimos invitar al usuario. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (member: MemberWithId, newRole: CompanyRole) => {
    if (member.role === "owner") return;
    try {
      const memberRef = doc(db, "companies", currentCompanyId, "members", member.id);
      await updateDoc(memberRef, { role: newRole });
    } catch (err) {
      console.error("Error actualizando rol", err);
      setError("No pudimos actualizar el rol.");
    }
  };

  const handleStatusToggle = async (member: MemberWithId, status: CompanyMemberStatus) => {
    try {
      const memberRef = doc(db, "companies", currentCompanyId, "members", member.id);
      await updateDoc(memberRef, { status });
    } catch (err) {
      console.error("Error actualizando estado", err);
      setError("No pudimos actualizar el estado.");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-primary">Miembros de la empresa</h3>
          <p className="text-sm text-gray-600">Administra quienes pueden acceder a SimpliGest dentro de tu empresa.</p>
        </div>
        <form className="flex items-center gap-2" onSubmit={handleInvite}>
          <input
            type="email"
            required
            value={inviteForm.email}
            onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="correo@ejemplo.com"
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={inviteForm.role}
            onChange={(event) => setInviteForm((prev) => ({ ...prev, role: event.target.value as CompanyRole }))}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm"
          >
            {submitting ? "Invitando..." : "Invitar"}
          </button>
        </form>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-600">Cargando miembros...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Correo</th>
                <th className="py-2">Rol</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-3 text-center text-gray-500">
                    Aún no hay miembros registrados.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="border-b last:border-none">
                    <td className="py-3">{member.email}</td>
                    <td className="py-3">
                      {member.role === "owner" ? (
                        <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {roleLabels[member.role]}
                        </span>
                      ) : (
                        <select
                          className="border rounded-lg px-2 py-1 text-sm"
                          value={member.role}
                          onChange={(event) => handleRoleChange(member, event.target.value as CompanyRole)}
                        >
                          {Object.entries(roleLabels)
                            .filter(([value]) => value !== "owner")
                            .map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                        </select>
                      )}
                    </td>
                    <td className="py-3">
                      <select
                        className="border rounded-lg px-2 py-1 text-sm"
                        value={member.status}
                        onChange={(event) =>
                          handleStatusToggle(member, event.target.value as CompanyMemberStatus)
                        }
                      >
                        <option value="active">Activo</option>
                        <option value="disabled">Deshabilitado</option>
                        <option value="invited">Invitado</option>
                      </select>
                    </td>
                    <td className="py-3 text-sm text-gray-600">
                      {member.userId === user?.uid && <span className="text-primary">Tú</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
