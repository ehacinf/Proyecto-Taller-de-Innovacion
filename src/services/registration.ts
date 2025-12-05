import type { User } from "firebase/auth";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import type { CompanyDoc } from "../models/tenant";

export async function registerUserAndCompany(params: {
  email: string;
  password: string;
  displayName: string;
  companyName: string;
  rut?: string;
  size?: CompanyDoc["size"];
}): Promise<void> {
  const { email, password, displayName, companyName, rut, size } = params;
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  try {
    if (displayName) {
      await updateProfile(user, { displayName });
    }

    const userRef = doc(db, "users", user.uid);
    const companyRef = doc(collection(db, "companies"));
    const memberRef = doc(collection(companyRef, "members"), user.uid);
    const createdAt = serverTimestamp();

    const batch = writeBatch(db);
    batch.set(userRef, {
      email,
      displayName,
      createdAt,
    });

    batch.set(companyRef, {
      name: companyName,
      rut,
      size,
      ownerId: user.uid,
      createdAt,
      isActive: true,
    });

    batch.set(memberRef, {
      userId: user.uid,
      email,
      role: "owner",
      status: "active",
      createdAt,
    });

    batch.update(userRef, { currentCompanyId: companyRef.id });

    await batch.commit();
    await linkPendingInvitationsToUser(user);
  } catch (error) {
    console.error("Error during registration flow", error);
    throw error;
  }
}

export async function linkPendingInvitationsToUser(user: User): Promise<void> {
  if (!user.email) return;

  const invitationsQuery = query(
    collectionGroup(db, "members"),
    where("email", "==", user.email),
    where("status", "==", "invited")
  );

  const snapshot = await getDocs(invitationsQuery);
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  let fallbackCompanyId: string | undefined;

  snapshot.forEach((docSnap) => {
    const parentCompanyId = docSnap.ref.parent.parent?.id;
    if (!parentCompanyId) return;
    if (!fallbackCompanyId) {
      fallbackCompanyId = parentCompanyId;
    }
    batch.update(docSnap.ref, {
      userId: user.uid,
      status: "active",
    });
  });

  if (fallbackCompanyId) {
    const userRef = doc(db, "users", user.uid);
    batch.set(
      userRef,
      { currentCompanyId: fallbackCompanyId, email: user.email, displayName: user.displayName || user.email },
      { merge: true }
    );
  }

  await batch.commit();
}
