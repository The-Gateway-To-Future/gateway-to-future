import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { firebaseConfig } from "../firebase";

const PROJECT_ID = firebaseConfig.projectId || "gateway-to-future";
const API_KEY = firebaseConfig.apiKey;
const FIRESTORE_REST_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

let cachedAdminApp: App | null | undefined;

function parseServiceAccount(): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} | null {
  const rawJson = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id || PROJECT_ID,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      // ignore malformed JSON and fall through
    }
  }

  const fbEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const fbKey = (process.env.FIREBASE_PRIVATE_KEY || "")
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/\\n/g, "\n");
  if (fbEmail && fbKey) {
    return {
      projectId: (process.env.FIREBASE_PROJECT_ID || PROJECT_ID).trim(),
      clientEmail: fbEmail,
      privateKey: fbKey,
    };
  }

  const googleEmail = (process.env.GOOGLE_CLIENT_EMAIL || "").trim();
  const googleKey = (process.env.GOOGLE_PRIVATE_KEY || "")
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/\\n/g, "\n");
  if (googleEmail && googleKey && googleEmail.includes(PROJECT_ID)) {
    return {
      projectId: PROJECT_ID,
      clientEmail: googleEmail,
      privateKey: googleKey,
    };
  }

  return null;
}

export async function getFirebaseAdminApp(): Promise<App | null> {
  if (cachedAdminApp !== undefined) return cachedAdminApp;

  const sa = parseServiceAccount();
  if (!sa) {
    cachedAdminApp = null;
    return null;
  }

  try {
    const { cert, getApps, initializeApp } = await import("firebase-admin/app");
    const existing = getApps().find((a) => a.name === "gtf-admin");
    if (existing) {
      cachedAdminApp = existing;
      return cachedAdminApp;
    }

    cachedAdminApp = initializeApp(
      {
        credential: cert({
          projectId: sa.projectId,
          clientEmail: sa.clientEmail,
          privateKey: sa.privateKey,
        }),
        projectId: sa.projectId,
      },
      "gtf-admin",
    );
    return cachedAdminApp;
  } catch (err) {
    console.warn("[GTF Firebase Admin] Initialization skipped:", err);
    cachedAdminApp = null;
    return null;
  }
}

export async function getFirebaseAdminAuth(): Promise<Auth | null> {
  const app = await getFirebaseAdminApp();
  if (!app) return null;
  try {
    const { getAuth } = await import("firebase-admin/auth");
    return getAuth(app);
  } catch {
    return null;
  }
}

export async function getFirebaseAdminFirestore(): Promise<Firestore | null> {
  const app = await getFirebaseAdminApp();
  if (!app) return null;
  try {
    const { getFirestore } = await import("firebase-admin/firestore");
    return getFirestore(app);
  } catch {
    return null;
  }
}

export interface VerifiedFirebaseIdentity {
  uid: string;
  email: string;
  displayName?: string;
  verifiedBy: "admin-sdk" | "identity-toolkit";
}

/**
 * Cryptographically verifies a Firebase ID token via Firebase Admin SDK,
 * falling back to Google Identity Toolkit `accounts:lookup` when Admin IAM
 * credentials are not provisioned in the runtime environment.
 */
export async function verifyFirebaseIdTokenServer(
  idToken: string,
): Promise<VerifiedFirebaseIdentity | null> {
  const cleanToken = idToken.trim();
  if (!cleanToken) return null;

  const adminAuth = await getFirebaseAdminAuth();
  if (adminAuth) {
    try {
      const decoded = await adminAuth.verifyIdToken(cleanToken, true);
      if (decoded.uid) {
        return {
          uid: decoded.uid,
          email: (decoded.email || "").toLowerCase().trim(),
          displayName: typeof decoded.name === "string" ? decoded.name : undefined,
          verifiedBy: "admin-sdk",
        };
      }
    } catch (err) {
      const code = (err as { code?: string })?.code || "";
      if (
        code === "auth/id-token-expired" ||
        code === "auth/id-token-revoked" ||
        code === "auth/argument-error"
      ) {
        return null;
      }
      // Fall through to Identity Toolkit lookup for IAM/config edge cases
    }
  }

  if (!API_KEY) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(API_KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: cleanToken }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      users?: Array<{ localId?: string; email?: string; displayName?: string }>;
    };
    const user = data.users?.[0];
    if (!user?.localId) return null;
    return {
      uid: user.localId,
      email: (user.email || "").toLowerCase().trim(),
      displayName: user.displayName,
      verifiedBy: "identity-toolkit",
    };
  } catch {
    return null;
  }
}

/**
 * Deletes the user's records across Firestore (`students`, `users`, `user_progress`).
 */
export async function deleteUserFirestoreRecords(params: {
  uid: string;
  email: string;
  studentId?: string;
  idToken: string;
}): Promise<{ deletedDocs: string[] }> {
  const deletedDocs: string[] = [];
  const { uid, email, studentId, idToken } = params;
  const derivedStudentId = `GTF-2026-${uid.slice(-4).toUpperCase()}`;
  const sanitizedEmail = email.replace(/[\/#\?\s]+/g, "_");

  const candidateTargets: Array<{ collection: string; docId: string }> = [
    { collection: "users", docId: uid },
    { collection: "students", docId: uid },
    { collection: "students", docId: derivedStudentId },
    { collection: "user_progress", docId: uid },
    { collection: "user_progress", docId: derivedStudentId },
  ];

  if (studentId && studentId.trim()) {
    const cleanSid = studentId.trim().replace(/[\/#\?\s]+/g, "_");
    candidateTargets.push({ collection: "students", docId: cleanSid });
    candidateTargets.push({ collection: "user_progress", docId: cleanSid });
  }
  if (sanitizedEmail) {
    candidateTargets.push({ collection: "students", docId: sanitizedEmail });
    candidateTargets.push({ collection: "users", docId: sanitizedEmail });
    candidateTargets.push({ collection: "user_progress", docId: sanitizedEmail });
  }

  const uniqueTargets = Array.from(
    new Map(candidateTargets.map((t) => [`${t.collection}/${t.docId}`, t])).values(),
  );

  const adminDb = await getFirebaseAdminFirestore();
  let adminSucceeded = false;

  if (adminDb) {
    try {
      for (const target of uniqueTargets) {
        await adminDb.collection(target.collection).doc(target.docId).delete();
        deletedDocs.push(`${target.collection}/${target.docId}`);
      }

      if (email) {
        for (const colName of ["students", "users"]) {
          const snap = await adminDb
            .collection(colName)
            .where("email", "==", email)
            .get();
          for (const docSnap of snap.docs) {
            await docSnap.ref.delete();
            deletedDocs.push(`${colName}/${docSnap.id}`);
          }
        }
      }
      adminSucceeded = true;
    } catch (err) {
      console.warn("[GTF Account Delete] Admin Firestore delete fallback to REST:", err);
    }
  }

  if (!adminSucceeded) {
    await Promise.allSettled(
      uniqueTargets.map(async (target) => {
        const url = `${FIRESTORE_REST_BASE}/${encodeURIComponent(target.collection)}/${encodeURIComponent(target.docId)}?key=${encodeURIComponent(API_KEY)}`;
        const res = await fetch(url, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "X-Goog-User-Project": PROJECT_ID,
          },
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          deletedDocs.push(`${target.collection}/${target.docId}`);
        }
      }),
    );
  }

  return { deletedDocs: Array.from(new Set(deletedDocs)) };
}

/**
 * Permanently deletes the Firebase Auth user via Firebase Admin SDK,
 * falling back to Google Identity Toolkit `accounts:delete` with the user's verified ID token.
 */
export async function deleteFirebaseAuthAccountServer(
  uid: string,
  idToken: string,
): Promise<{
  deleted: boolean;
  method?: "admin-sdk" | "identity-toolkit";
  error?: string;
  code?: string;
}> {
  const adminAuth = await getFirebaseAdminAuth();
  if (adminAuth) {
    try {
      await adminAuth.deleteUser(uid);
      return { deleted: true, method: "admin-sdk" };
    } catch (err) {
      const code = (err as { code?: string })?.code || "";
      if (code === "auth/user-not-found") {
        return { deleted: true, method: "admin-sdk" };
      }
      console.warn(
        "[GTF Account Delete] Admin Auth delete fallback to Identity Toolkit:",
        code || err,
      );
    }
  }

  if (!API_KEY) {
    return { deleted: false, error: "Firebase API key is not configured on the server." };
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${encodeURIComponent(API_KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: idToken.trim() }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (res.ok) {
      return { deleted: true, method: "identity-toolkit" };
    }
    const errBody = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    const message = errBody?.error?.message || `HTTP ${res.status}`;
    return { deleted: false, error: message, code: message };
  } catch (err) {
    return {
      deleted: false,
      error: err instanceof Error ? err.message : "Failed to delete Firebase Auth account.",
    };
  }
}
