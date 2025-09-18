"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { IconTerminal } from "@tabler/icons-react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

function DateBadge() {
  const [date, setDate] = useState<number>(new Date().getDate());

  // update once per hour
  useEffect(() => {
    const interval = setInterval(() => setDate(new Date().getDate()), 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-12 h-12 bg-[#C8A2D6] rounded-lg flex flex-col items-center text-black font-bold shadow-sm">
      {/* top bar */}
      <div className="w-6 h-1 bg-black mt-1 rounded-sm"></div>

      {/* number with gap */}
      <span className="text-2xl mt-0.5">{date}</span>
    </div>
  );
}

type LeftSidebarProps = {
  onToggleSidebar?: () => void;
};

export default function LeftSidebar({ onToggleSidebar }: LeftSidebarProps) {
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
    <aside className="fixed left-0 top-0 h-screen w-20 bg-[#151515] flex flex-col justify-between items-center py-6 z-20">
      <div className="flex flex-col items-center space-y-6">
        {/* Logo */}
        <div className="mb-8">
          <Image src="/images/main-logo.svg" alt="Toddler Logo" width={40} height={40} />
        </div>

        {/* Date badge */}
        <DateBadge />
      </div>

      {/* Terminal collapse button + profile */}
      <div className="flex flex-col items-center space-y-4 mb-4">
        <button
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#252525] text-white hover:bg-[#333333] transition"
          onClick={() => onToggleSidebar && onToggleSidebar()}
        >
          <IconTerminal size={20} stroke={1.5} />
        </button>

        {photoURL ? (
          <img src={photoURL} alt="User Avatar" width={40} height={40} className="rounded-full" referrerPolicy="no-referrer" />
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
  );
}
