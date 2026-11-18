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

export const GTF_N8N_SIGNUP_WEBHOOK_URL =
  "https://n8n.gatewaytofuture.com/webhook/firebase-auth-signup";

/**
 * Pushes newly registered Firebase Auth student identity directly to GTF's
 * GCP n8n onboarding webhook so WhatsApp welcome flows fire asynchronously.
 * Silently ignores any network/timeout error so signup is never blocked.
 */
export async function pushSignupToN8nWebhook(payload: {
  studentId: string;
  fullName: string;
  email: string;
  phone?: string;
  course?: string;
  uid?: string;
}): Promise<void> {
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 5000) : null;

    await fetch(GTF_N8N_SIGNUP_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: "firebase_auth_signup",
        studentId: payload.studentId,
        fullName: payload.fullName,
        name: payload.fullName,
        email: payload.email,
        phone: payload.phone || "",
        course: payload.course || "A1",
        uid: payload.uid || "",
        source: "gtf-exam-portal",
        timestamp: new Date().toISOString(),
      }),
      signal: controller?.signal,
    }).finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    });
  } catch {
    // Silently catch webhook errors so signup process never blocks even if n8n is unreachable
  }
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
