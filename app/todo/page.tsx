"use client";
import { useEffect, useState } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import Image from "next/image";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function TodoPage() {
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setPhotoURL(null);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setPhotoURL(data.photoURL || user.photoURL || null);
        } else {
          // no Firestore record → fallback to Google photoURL
          setPhotoURL(user.photoURL || null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setPhotoURL(user.photoURL || null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <ProtectedRoute>
      <div className="flex">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 h-screen w-20 bg-[#151515] flex flex-col justify-between items-center py-6">
          {/* Top Section */}
          <div className="flex flex-col items-center space-y-6">
            <div className="mb-8">
              <Image
                src="/images/main-logo.svg"
                alt="Toddler Logo"
                width={40}
                height={40}
              />
            </div>
          </div>

          {/* Bottom Section (User Profile) */}
          <div className="mb-4">
            {photoURL ? (
              <img
                src={photoURL}
                alt="User Avatar"
                width={40}
                height={40}
                className="rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <img
                src="https://api.dicebear.com/6.x/adventurer-neutral/svg?seed=Default"
                alt="Default Avatar"
                width={40}
                height={40}
                className="rounded-full"
              />
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-20 p-6">
          <h1 className="text-2xl font-bold">Your Todo App</h1>
          <p>Welcome! You are logged in.</p>
          <div className="h-[150vh] bg-gray-100 mt-6 rounded-lg p-4">
            Scroll to see sidebar stays fixed.
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
