"use client";
import { useEffect, useState } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import Image from "next/image";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { IconPlus, IconMinus, IconTerminal } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TodoPage() {
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState({
    thisWeek: false,
    thisMonth: true,
    personal: true,
    books: true,
  });

  // Fetch logged-in user profile image
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

          {/* User Profile Avatar + Collapse Icon(IconTerminal)*/}
          <div className="flex flex-col items-center space-y-4 mb-4">
            {/* Terminal icon button */}
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-[#252525] text-white hover:bg-[#333333] transition">
              <IconTerminal size={20} stroke={1.5} />
            </button>
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
          {/* Sidebar header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-3xl font-medium tracking-wide">
              Todos
            </h2>
            <button
              aria-label="Add"
              className="w-9 h-9 bg-[#252525] rounded-md flex items-center justify-center text-white shadow-sm"
              type="button"
            >
              <IconPlus size={16} className="text-white" stroke={1.5} />
            </button>
          </div>

          {/* Todo Groups */}
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
              todos: [
                "Prepare quarterly report",
                "Update landing page",
                "Team offsite",
              ],
            },
            {
              key: "personal",
              title: "Personal",
              todos: [
                "Buy more coffee filters",
                "Cancel Disney+",
                "Donate to Unica",
              ],
            },
            {
              key: "books",
              title: "Books to read",
              todos: ["Atomic Habits", "Clean Code", "Deep Work"],
            },
          ].map((group) => (
            <div key={group.key} className="mb-2">
              <div className="bg-[#151515] rounded-lg overflow-hidden">
                {/* Group Header */}
                <button
                  className="w-full flex justify-between items-center px-3 py-2 font-medium hover:bg-[#1f1f1f] transition"
                  onClick={() =>
                    setCollapsed((prev) => ({
                      ...prev,
                      [group.key]: !prev[group.key as keyof typeof prev],
                    }))
                  }
                >
                  <span
                    className={
                      collapsed[group.key as keyof typeof collapsed]
                        ? "text-[#BDBDBD]" // collapsed color
                        : "text-[#C8A2D6]" // expanded color
                    }
                  >
                    {group.title}
                  </span>

                  {/* Toggle Icon */}
                  <motion.div
                    key={
                      collapsed[group.key as keyof typeof collapsed]
                        ? "plus"
                        : "minus"
                    }
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    {collapsed[group.key as keyof typeof collapsed] ? (
                      <IconPlus size={16} className="text-[#6A6A6A]" />
                    ) : (
                      <IconMinus size={16} className="text-[#6A6A6A]" />
                    )}
                  </motion.div>
                </button>

                {/* Animated Todos */}
                <AnimatePresence>
                  {!collapsed[group.key as keyof typeof collapsed] && (
                    <motion.ul
                      className="p-3 space-y-2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      {group.todos.map((todo, i) => (
                        <motion.li
                          key={i}
                          className="flex items-center space-x-2 px-2 py-1 rounded-md hover:bg-[#1f1f1f] transition-colors duration-200"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{
                            duration: 0.25,
                            delay: i * 0.07,
                          }}
                        >
                          {/* Custom Checkbox */}
                          <label className="relative flex items-center cursor-pointer">
                            <input type="checkbox" className="peer hidden" />
                            <span className="w-5 h-5 rounded-md border border-[#424242] flex items-center justify-center transition-colors peer-checked:bg-[#C8A2D6] peer-checked:border-[#C8A2D6]">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-3 h-3 text-white hidden peer-checked:block"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </span>
                          </label>

                          <span className="text-white">{todo}</span>
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
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
