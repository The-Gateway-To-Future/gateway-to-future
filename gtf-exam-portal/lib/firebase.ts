import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import {
  browserLocalPersistence,
  getAuth,
  initializeAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";

export const firebaseConfig = {
  apiKey:
    (process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "undefined"
      ? process.env.NEXT_PUBLIC_FIREBASE_API_KEY.trim()
      : "") || "AIzaSyDMknBXArsfivplUufLG3_m8fhCiHP2jKE",
  authDomain:
    (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN !== "undefined"
      ? process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN.trim()
      : "") || "gateway-to-future.firebaseapp.com",
  projectId:
    (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "undefined"
      ? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID.trim()
      : "") || "gateway-to-future",
  storageBucket:
    (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET &&
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET !== "undefined"
      ? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.trim()
      : "") || "gateway-to-future.firebasestorage.app",
  messagingSenderId:
    (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID !== "undefined"
      ? process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID.trim()
      : "") || "923620323895",
  appId:
    (process.env.NEXT_PUBLIC_FIREBASE_APP_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID !== "undefined"
      ? process.env.NEXT_PUBLIC_FIREBASE_APP_ID.trim()
      : "") || "1:923620323895:web:e71b783b8641f2025105b2",
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseFirestore(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
  }
  return storage;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const firebaseApp = getFirebaseApp();
    if (typeof window !== "undefined") {
      try {
        auth = initializeAuth(firebaseApp, {
          persistence: browserLocalPersistence,
        });
      } catch {
        auth = getAuth(firebaseApp);
      }
      setPersistence(auth, browserLocalPersistence).catch(() => {});
    } else {
      auth = getAuth(firebaseApp);
    }
  }
  return auth;
}

/**
 * Deprecated client-side webhook helper kept as a no-op to avoid breaking external imports.
 * All signup/welcome webhook dispatch is strictly handled server-side in `/api/auth/register`
 * so webhook endpoints are never exposed to client-side abuse or duplicated.
 */
export async function pushSignupToN8nWebhook(_payload: {
  studentId: string;
  fullName: string;
  email: string;
  phone?: string;
  course?: string;
  uid?: string;
}): Promise<void> {
  // No-op: handled server-side via triggerStudentWelcomeWebhook()
}

export async function ensureFirebaseLocalPersistence(): Promise<Auth> {
  const firebaseAuth = getFirebaseAuth();
  if (typeof window !== "undefined") {
    try {
      await setPersistence(firebaseAuth, browserLocalPersistence);
    } catch {
      // Ignore if persistence is already locked in this runtime
    }
  }
  return firebaseAuth;
}
