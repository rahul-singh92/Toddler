"use client";
import { useState } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import LeftSidebar from "../components/LeftSidebar";
import { IconPlus, IconMinus, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

/* --- helpers --- */
function getWeekNumber(date: Date) {
  const firstDayofYear = new Date(date.getFullYear(), 0, 1);
  const pastDays = (date.getTime() - firstDayofYear.getTime()) / 86400000;
  return Math.ceil((pastDays + firstDayofYear.getDay() + 1) / 7);
}

/* --- HeaderBar component (kept here for now) --- */
function HeaderBar() {
  const today = new Date();
  const [monthYear] = useState(today.toLocaleString("default", { month: "long", year: "numeric" }));
  const [week] = useState(getWeekNumber(today));

  return (
    <div className="sticky top-0 z-30 bg-white px-8 py-5 flex items-center justify-between">
      <div className="flex items-center space-x-6">
        <h1 className="text-2xl font-bold">{monthYear}</h1>
        <div className="flex items-center space-x-4">
          <span className="text-4xl leading-none">/</span>
          <select className="font-semibold text-lg bg-transparent focus:outline-none cursor-pointer">
            <option value={week}>W{week}</option>
          </select>
        </div>
        <button className="p-2 rounded hover:bg-gray-100">
          <IconChevronLeft size={22} stroke={2.2} />
        </button>
        <button className="p-2 rounded hover:bg-gray-100">
          <IconChevronRight size={22} stroke={2.2} />
        </button>
      </div>

      <div className="flex space-x-3">
        <button className="px-4 py-2 rounded-md bg-[#EAEAEA] text-base font-medium hover:bg-[#D5D5D5]">Today</button>
        <button className="px-4 py-2 rounded-md bg-black text-white text-base font-medium hover:bg-[#1A1A1A]">Share</button>
      </div>
    </div>
  );
}

/* --- Todo page --- */
export default function TodoPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsed, setCollapsed] = useState({
    thisWeek: false,
    thisMonth: true,
    personal: true,
    books: true,
  });

  const groups = [
    {
      key: "thisWeek",
      title: "This Week",
      todos: ["Design onboarding", "Publish blog post", "Book offsite", "Setup Zapier integration"],
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
  ];

  return (
    <ProtectedRoute>
      <div className="flex">
        {/* LEFT SIDEBAR */}
        <LeftSidebar onToggleSidebar={() => setSidebarCollapsed((s) => !s)} />

        {/* Second Sidebar (slides horizontally behind left sidebar) */}
        <motion.aside
          initial={false}
          animate={{ x: sidebarCollapsed ? -288 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed left-20 top-0 h-screen w-72 bg-black p-5 flex flex-col overflow-y-auto z-10 shadow-lg"
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-3xl font-medium tracking-wide">Todos</h2>
            <button aria-label="Add" className="w-9 h-9 bg-[#252525] rounded-md flex items-center justify-center text-white shadow-sm hover:bg-[#1f1f1f]" type="button">
              <IconPlus size={16} className="text-white" stroke={1.5} />
            </button>
          </div>

          {/* Todo Groups */}
          {groups.map((group) => (
            <div key={group.key} className="mb-2">
              <div className="bg-[#151515] rounded-lg overflow-hidden">
                <button
                  className="w-full flex justify-between items-center px-3 py-2 font-medium hover:bg-[#1f1f1f] transition"
                  onClick={() =>
                    setCollapsed((prev) => ({
                      ...prev,
                      [group.key]: !prev[group.key as keyof typeof prev],
                    }))
                  }
                >
                  <span className={collapsed[group.key as keyof typeof collapsed] ? "text-[#BDBDBD]" : "text-[#C8A2D6]"}>
                    {group.title}
                  </span>

                  <div>
                    {collapsed[group.key as keyof typeof collapsed] ? (
                      <IconPlus size={16} className="text-[#6A6A6A]" />
                    ) : (
                      <IconMinus size={16} className="text-[#6A6A6A]" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {!collapsed[group.key as keyof typeof collapsed] && (
                    <motion.ul className="p-3 space-y-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
                      {group.todos.map((todo, i) => (
                        <motion.li
                          key={i}
                          className="flex items-center space-x-2 px-2 py-1 rounded-md hover:bg-[#1f1f1f] transition-colors duration-200"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.25, delay: i * 0.07 }}
                        >
                          <label className="relative flex items-center cursor-pointer">
                            <input type="checkbox" className="peer hidden" />
                            <span className="w-5 h-5 rounded-md border border-[#424242] flex items-center justify-center transition-colors peer-checked:bg-[#C8A2D6] peer-checked:border-[#C8A2D6]">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white hidden peer-checked:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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
        </motion.aside>

        {/* Main content area */}
        <motion.main initial={false} animate={{ marginLeft: sidebarCollapsed ? "5rem" : "23rem" }} transition={{ duration: 0.3, ease: "easeInOut" }} className="flex-1">
          {/* Fixed top header */}
          <HeaderBar />
          <div className="p-6">
            <h1 className="text-2xl font-bold">Your Todo App</h1>
            <p>Welcome! You are logged in.</p>
            <div className="h-[150vh] bg-gray-100 mt-6 rounded-lg p-4">Scroll to see sidebars stay fixed.</div>
          </div>
        </motion.main>
      </div>
    </ProtectedRoute>
  );
}
