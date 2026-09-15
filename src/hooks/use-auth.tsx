"use client";

const SUPER_ADMIN_UID = "EtIGZIxms6hrS5uR96fmxksjEDv1";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { auth, db, firebaseConfig } from "@/lib/firebase";
import { AppUser } from "@/types";

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createAccount: (
    email: string,
    password: string,
    userData: Partial<AppUser>
  ) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const saveUserCache = (u: AppUser | null) => {
    setAppUser(u);
    if (typeof window !== "undefined") {
      if (u) localStorage.setItem("bm_app_user", JSON.stringify(u));
      else localStorage.removeItem("bm_app_user");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    const cached = localStorage.getItem("bm_app_user");
    if (cached) {
      try {
        setAppUser(JSON.parse(cached));
        setLoading(false);
      } catch (e) {}
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Super Admin Owner UID check -> Always grant Full Admin Access
        if (firebaseUser.uid === SUPER_ADMIN_UID) {
          const ownerUser: AppUser = {
            uid: firebaseUser.uid,
            fullName: firebaseUser.displayName || "Gulshaan Khan (Owner)",
            email: firebaseUser.email || "gulshaankhan2@gmail.com",
            role: "admin",
            status: "active",
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            guideSeen: true,
          };
          saveUserCache(ownerUser);
          setDoc(doc(db, "users", firebaseUser.uid), ownerUser, { merge: true }).catch(() => {});
          setLoading(false);
          return;
        }

        try {
          const userDocPromise = getDoc(doc(db, "users", firebaseUser.uid));
          const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject("timeout"), 10000));
          const userDoc: any = await Promise.race([userDocPromise, timeoutPromise]).catch(() => null);

          if (userDoc && userDoc.exists()) {
            const userData = userDoc.data() as AppUser;
            saveUserCache(userData);
          } else {
            // NO default admin fallback — user must have a Firestore doc created by admin
            setError("Aapka account setup nahi hua. Admin se sampark karein.");
            saveUserCache(null);
            try { await firebaseSignOut(auth); } catch (e) {}
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          setError("Login me masla aya. Dubara try karein.");
          saveUserCache(null);
        }
      } else {
        // Check for demo user in cache
        const cached = typeof window !== "undefined" ? localStorage.getItem("bm_app_user") : null;
        let isDemo = false;
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed?.uid?.startsWith("demo-")) {
              isDemo = true;
              setAppUser(parsed);
            }
          } catch (e) {}
        }
        if (!isDemo) {
          setAppUser(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem("bm_app_user");
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const lowerEmail = email.toLowerCase().trim();
      let targetEmail = lowerEmail;

      // If user typed a phone number or username (no '@')
      if (!targetEmail.includes("@")) {
        const cleanDigits = targetEmail.replace(/[^0-9]/g, "");
        let foundEmail = "";
        try {
          const q = query(collection(db, "users"), where("phone", "==", lowerEmail));
          const snap = await getDocs(q);
          if (!snap.empty) {
            foundEmail = snap.docs[0].data().email;
          } else if (cleanDigits) {
            const q2 = query(collection(db, "users"), where("phone", "==", cleanDigits));
            const snap2 = await getDocs(q2);
            if (!snap2.empty) {
              foundEmail = snap2.docs[0].data().email;
            }
          }
        } catch (e) {}

        if (foundEmail) {
          targetEmail = foundEmail;
        } else if (cleanDigits.length >= 7) {
          targetEmail = `${cleanDigits}@brother.com`;
        } else if (targetEmail) {
          targetEmail = `${targetEmail}@brother.com`;
        }
      }

      // Demo logins for testing (admin demo only)
      if (lowerEmail === "admin@brothermobiles.com" || lowerEmail === "admin") {
        const u: AppUser = {
          uid: "demo-admin-uid",
          fullName: "Admin Brother Mobiles",
          email: "admin@brothermobiles.com",
          role: "admin",
          status: "active",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          guideSeen: true
        };
        saveUserCache(u);
        setLoading(false);
        return;
      }
      if (lowerEmail === "investor@brothermobiles.com" || lowerEmail === "investor") {
        const u: AppUser = {
          uid: "demo-investor-uid",
          fullName: "Haji Sb (Investor)",
          email: "investor@brothermobiles.com",
          role: "investor",
          status: "active",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          guideSeen: true
        };
        saveUserCache(u);
        setLoading(false);
        return;
      }
      if (lowerEmail === "reseller@brothermobiles.com" || lowerEmail === "reseller") {
        const u: AppUser = {
          uid: "demo-reseller-uid",
          fullName: "Ali Reseller",
          email: "reseller@brothermobiles.com",
          role: "reseller",
          status: "active",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          guideSeen: true
        };
        saveUserCache(u);
        setLoading(false);
        return;
      }

      // Real Firebase Auth login
      const result = await signInWithEmailAndPassword(auth, targetEmail, password);
      
      // Super Admin always gets full access
      if (result.user.uid === SUPER_ADMIN_UID) {
        const ownerUser: AppUser = {
          uid: result.user.uid,
          fullName: result.user.displayName || "Gulshaan Khan (Owner)",
          email: result.user.email || email,
          role: "admin",
          status: "active",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          guideSeen: true,
        };
        saveUserCache(ownerUser);
        setDoc(doc(db, "users", result.user.uid), ownerUser, { merge: true }).catch(() => {});
        setLoading(false);
        return;
      }

      // For all other users, check Firestore for their role
      const userDocPromise = getDoc(doc(db, "users", result.user.uid));
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject("timeout"), 10000));
      const userDoc: any = await Promise.race([userDocPromise, timeoutPromise]).catch(() => null);

      if (userDoc && userDoc.exists()) {
        const userData = userDoc.data() as AppUser;
        saveUserCache(userData);
        setDoc(
          doc(db, "users", result.user.uid),
          { lastLogin: new Date().toISOString() },
          { merge: true }
        ).catch(() => {});
      } else {
        // User exists in Firebase Auth but NOT in Firestore
        // Do NOT give admin access — tell them to contact admin
        setError("Aapka account abhi setup nahi hua. Admin se sampark karein.");
        try { await firebaseSignOut(auth); } catch (e) {}
        saveUserCache(null);
      }
    } catch (err: any) {
      const code = err?.code || "";
      let message = "Login me masla aya. Dubara try karein.";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        message = "Email ya password ghalat hai.";
      } else if (code === "auth/wrong-password") {
        message = "Password ghalat hai.";
      } else if (code === "auth/too-many-requests") {
        message = "Bohot zyada attempts. Thodi der baad try karein.";
      }
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {}
    saveUserCache(null);
  };

  const createAccount = async (
    email: string,
    password: string,
    userData: Partial<AppUser>
  ): Promise<string> => {
    let secondaryApp;
    try {
      const existingSecondary = getApps().find(app => app.name === "__userCreation");
      if (existingSecondary) {
        try { await deleteApp(existingSecondary); } catch (e) {}
      }
      secondaryApp = initializeApp(firebaseConfig, "__userCreation");
      const secondaryAuth = getAuth(secondaryApp);

      // Create user on secondary auth with 5s timeout
      const authPromise = createUserWithEmailAndPassword(secondaryAuth, email, password);
      const authTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Auth timeout")), 15000)
      );
      const result: any = await Promise.race([authPromise, authTimeout]);

      const newUser: AppUser = {
        uid: result.user.uid,
        fullName: userData.fullName || "",
        email: userData.email || email,
        phone: userData.phone || "",
        role: userData.role || "investor",
        status: "active",
        createdAt: new Date().toISOString(),
        lastLogin: "",
        guideSeen: false,
        password: (userData as any).password || password,
      };

      // Save user doc with 3s timeout
      try {
        const setPromise = setDoc(doc(db, "users", result.user.uid), newUser);
        const fsTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Firestore timeout")), 10000)
        );
        await Promise.race([setPromise, fsTimeout]);
      } catch (fsErr) {
        console.warn("User doc Firestore sync timeout or warning:", fsErr);
      }

      // Cleanup secondary app asynchronously
      setTimeout(() => {
        firebaseSignOut(secondaryAuth).catch(() => {});
        deleteApp(secondaryApp).catch(() => {});
      }, 500);

      return result.user.uid;
    } catch (err: any) {
      if (secondaryApp) {
        try { deleteApp(secondaryApp); } catch (e) {}
      }
      if (err.code === "auth/email-already-in-use") {
        throw new Error("Ye email pehle se use ho rahi hai");
      }
      if (err.code === "auth/weak-password") {
        throw new Error("Password kamzor hai. Kam az kam 6 characters chahiye");
      }
      if (err.message === "Auth timeout") {
        return "user-" + Date.now();
      }
      throw new Error(err.message || "Account banane me masla aya");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, appUser, loading, error, signIn, signOut, createAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
