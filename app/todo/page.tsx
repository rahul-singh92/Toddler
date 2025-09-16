"use client";
import { useEffect, useState } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import Image from "next/image";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { IconPlus } from "@tabler/icons-react";

export default function TodoPage() {
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState({
    thisWeek: false,
    thisMonth: true,
    personal: true,
    books: true,
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
              <Image src="/images/main-logo.svg" alt="Toddler Logo" width={40} height={40} />
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
        <aside className="fixed left-20 top-0 h-screen w-72 bg-black p-5 flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-4xl font-semibold tracking-wide">Todos</h2>

            {/* Little + button (no functionality) */}
            <button
              aria-label="Add"
              className="w-9 h-9 bg-[#252525] rounded-md flex items-center justify-center text-white text-lg shadow-sm"
              type="button"
            >
              <IconPlus size={16} className="text-white" stroke={1.5} />
            </button>
          </div>

          {/* Group Component */}
          {[
            {
              key: "thisWeek",
              title: "This Week",
              todos: [
                "Design onboarding",
                "Publish blog post",
                "Book offsite",
                "Setup Zapier integration",
              ],
            },
            {
              key: "thisMonth",
              title: "This Month",
              todos: ["Prepare quarterly report", "Update landing page", "Team offsite"],
            },
            {
              key: "personal",
              title: "Personal",
              todos: ["Buy more coffee filters", "Cancel Disney+", "Donate to Unica"],
            },
            {
              key: "books",
              title: "Books to read",
              todos: ["Atomic Habits", "Clean Code", "Deep Work"],
            },
          ].map((group) => (
            <div key={group.key} className="mb-4">
              <button
                className="text-[#C8A2D6] font-semibold w-full text-left mb-2"
                onClick={() =>
                  setCollapsed((prev) => ({
                    ...prev,
                    [group.key]: !prev[group.key as keyof typeof prev],
                  }))
                }
              >
                {group.title}
              </button>
              {!collapsed[group.key as keyof typeof collapsed] && (
                <ul className="bg-[#151515] rounded-lg p-3 space-y-2">
                  {group.todos.map((todo, i) => (
                    <li key={i} className="flex items-center space-x-2">
                      <input type="checkbox" className="accent-[#C8A2D6]" />
                      <span className="text-white">{todo}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-[23rem] p-6">
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
