"use client";
import { useEffect, useState } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import Image from "next/image";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function TodoPage() {
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState({
    thisWeek: false,
    thisMonth: true,
  });

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
        {/* First Sidebar */}
        <aside className="fixed left-0 top-0 h-screen w-20 bg-[#151515] flex flex-col justify-between items-center py-6">
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

        {/* Second Sidebar */}
        <aside className="fixed left-20 top-0 h-screen w-64 bg-black p-4 flex flex-col space-y-4 overflow-y-auto">
          <h2 className="text-white text-xl font-bold mb-4">Todos</h2>

          {/* This Week Group */}
          <div>
            <button
              className="text-[#C8A2D6] font-semibold w-full text-left mb-2"
              onClick={() =>
                setCollapsed((prev) => ({ ...prev, thisWeek: !prev.thisWeek }))
              }
            >
              This Week
            </button>
            {!collapsed.thisWeek && (
              <ul className="bg-[#151515] rounded p-2 space-y-2">
                <li className="flex items-center space-x-2">
                  <input type="checkbox" />
                  <span className="text-white">Todo 1</span>
                </li>
                <li className="flex items-center space-x-2">
                  <input type="checkbox" />
                  <span className="text-white">Todo 2</span>
                </li>
                <li className="flex items-center space-x-2">
                  <input type="checkbox" />
                  <span className="text-white">Todo 3</span>
                </li>
              </ul>
            )}
          </div>

          {/* This Month Group */}
          <div>
            <button
              className="text-[#C8A2D6] font-semibold w-full text-left mb-2"
              onClick={() =>
                setCollapsed((prev) => ({ ...prev, thisMonth: !prev.thisMonth }))
              }
            >
              This Month
            </button>
            {!collapsed.thisMonth && (
              <ul className="bg-[#151515] rounded p-2 space-y-2">
                <li className="flex items-center space-x-2">
                  <input type="checkbox" />
                  <span className="text-white">Todo A</span>
                </li>
                <li className="flex items-center space-x-2">
                  <input type="checkbox" />
                  <span className="text-white">Todo B</span>
                </li>
                <li className="flex items-center space-x-2">
                  <input type="checkbox" />
                  <span className="text-white">Todo C</span>
                </li>
              </ul>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-[20rem] p-6">
          <h1 className="text-2xl font-bold">Your Todo App</h1>
          <p>Welcome! You are logged in.</p>
          <div className="h-[150vh] bg-gray-100 mt-6 rounded-lg p-4">
            Scroll to see sidebars stay fixed.
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
