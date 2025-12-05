import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import type { Unsubscribe } from "firebase/firestore";
import { auth, db } from "../firebase";
import type {
  CompanyDoc,
  CompanyMemberDoc,
  CompanyRole,
  UserDoc,
} from "../models/tenant";

interface CompanyContextValue {
  currentCompanyId?: string;
  currentCompany: CompanyDoc | null;
  currentMember: CompanyMemberDoc | null;
  role: CompanyRole | null;
  loading: boolean;
  error: Error | null;
  setCurrentCompanyId: (companyId: string) => Promise<void>;
  user: User | null;
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [currentCompany, setCurrentCompany] = useState<CompanyDoc | null>(null);
  const [currentMember, setCurrentMember] = useState<CompanyMemberDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setUserDoc(null);
      setCurrentCompany(null);
      setCurrentMember(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userRef = doc(db, "users", user.uid);
    let companyUnsubscribe: Unsubscribe | undefined;
    let memberUnsubscribe: Unsubscribe | undefined;

    const unsubscribeUser = onSnapshot(
      userRef,
      (snapshot) => {
        companyUnsubscribe?.();
        memberUnsubscribe?.();
        if (!snapshot.exists()) {
          setUserDoc(null);
          setCurrentCompany(null);
          setCurrentMember(null);
          setLoading(false);
          return;
        }
        const data = snapshot.data() as UserDoc;
        setUserDoc(data);
        if (!data.currentCompanyId) {
          setCurrentCompany(null);
          setCurrentMember(null);
          setLoading(false);
          return;
        }

        const companyRef = doc(db, "companies", data.currentCompanyId);
        const memberRef = doc(companyRef, "members", user.uid);

        companyUnsubscribe = onSnapshot(
          companyRef,
          (companySnap) => {
            setCurrentCompany(companySnap.exists() ? (companySnap.data() as CompanyDoc) : null);
          },
          (err) => setError(err)
        );

        memberUnsubscribe = onSnapshot(
          memberRef,
          (memberSnap) => {
            setCurrentMember(memberSnap.exists() ? (memberSnap.data() as CompanyMemberDoc) : null);
          },
          (err) => setError(err)
        );
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeUser();
      companyUnsubscribe?.();
      memberUnsubscribe?.();
    };
  }, [user]);

  const setCurrentCompanyId = async (companyId: string) => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { currentCompanyId: companyId }, { merge: true });
  };

  const value: CompanyContextValue = useMemo(
    () => ({
      currentCompanyId: userDoc?.currentCompanyId,
      currentCompany,
      currentMember,
      role: currentMember?.role ?? null,
      loading,
      error,
      setCurrentCompanyId,
      user,
    }),
    [currentCompany, currentMember, error, loading, setCurrentCompanyId, user, userDoc?.currentCompanyId]
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany(): CompanyContextValue {
  const ctx = useContext(CompanyContext);
  if (!ctx) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return ctx;
}
