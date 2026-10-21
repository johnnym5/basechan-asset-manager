import { initializeApp, getApps, getApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider, User } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection, query, where, getDocs, getDoc, doc, setDoc, serverTimestamp
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { UserRole, UserProfile } from "@/types/assets";

export const firebaseConfig = {
  apiKey: "AIzaSyB-3rFNmiIR7bYKGNCGOYFoYfvQfYLrR98",
  authDomain: "basechan-am.firebaseapp.com",
  projectId: "basechan-am",
  storageBucket: "basechan-am.firebasestorage.app",
  messagingSenderId: "316714277090",
  appId: "1:316714277090:web:e851bf6528c39043ac26bb",
  measurementId: "G-XDDKYVBXGX"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
export const storage = getStorage(app);

if (process.env.NEXT_PUBLIC_E2E_AUTH_EMULATOR === "true" && typeof window !== "undefined") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/**
 * Evaluates Google OAuth user email against organization domain rules.
 */
export function resolveUserRole(email: string): UserRole {
  const normalized = email.toLowerCase().trim();
  if (normalized.endsWith("@basechaninternational.com")) {
    return "SUPER_ADMIN";
  }
  if (/^[^@]+\.basechaninternational@gmail\.com$/.test(normalized)) {
    return "STAFF";
  }
  return "UNAUTHORIZED";
}

/**
 * Reconciles authenticated user against Staff Inventory records in Firestore.
 */
export async function syncUserProfile(user: User): Promise<UserProfile> {
  if (!user.email) throw new Error("Authenticated user has no email address.");

  const role = resolveUserRole(user.email);
  if (role === "UNAUTHORIZED") {
    await auth.signOut();
    throw new Error("Access Denied: Only authorized Basechan corporate or staff Google accounts are permitted.");
  }

  let department = "Operations";
  let staffId = "";
  let branch: string | undefined;
  let directoryDisplayName = "";

  // Attempt to match with staff_inventory collection by email
  try {
    const staffQuery = query(collection(db, "staff_inventory"), where("email", "==", user.email.toLowerCase().trim()));
    const staffSnap = await getDocs(staffQuery);
    if (!staffSnap.empty) {
      const staffData = staffSnap.docs[0].data();
      if (staffData.department) department = staffData.department;
      if (staffData.name) directoryDisplayName = String(staffData.name);
      if (staffData.id) staffId = staffData.id;
      if (staffData.branch) branch = staffData.branch;
    }
  } catch (err) {
    // Staff-directory enrichment is optional; the verified Google identity and
    // its domain-derived role remain valid even if this lookup is denied/offline.
    console.warn("Could not load optional staff profile details:", err);
  }

  const profile: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || directoryDisplayName || user.email.split("@")[0],
    photoURL: user.photoURL || null,
    role: role,
    branch,
    department: department,
    staffId: staffId,
  };

  try {
    const existingProfile = await getDoc(doc(db, "users", user.uid));
    if (existingProfile.exists()) {
      profile.onboardingCompletedAt = existingProfile.data().onboardingCompletedAt;
    }
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email.toLowerCase().trim(),
      displayName: profile.displayName,
      photoURL: profile.photoURL || null,
      lastLogin: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn("Could not save user document to Firestore:", err);
  }

  return profile;
}
