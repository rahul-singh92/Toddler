"use client";
import React, { useState } from "react";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { cn } from "../lib/utils";
import { IconBrandGoogle, IconEye, IconEyeOff } from "@tabler/icons-react";
import { auth, googleProvider, db } from "../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import Image from "next/image";
import { useRouter } from "next/navigation";
import InfiniteWalkingLoader from "../components/InfiniteWalkingLoader";

export default function AuthForm() {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const email = (document.getElementById("email") as HTMLInputElement).value;
    const password = (document.getElementById("password") as HTMLInputElement).value;

    const fName =
      mode === "signup"
        ? (document.getElementById("firstname") as HTMLInputElement).value
        : "";
    const lName =
      mode === "signup"
        ? (document.getElementById("lastname") as HTMLInputElement).value
        : "";

    try {
      if (mode === "signup") {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCred.user;

        const avatarUrl = `https://api.dicebear.com/6.x/adventurer-neutral/svg?seed=${fName}+${lName}`;

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          firstName: fName,
          lastName: lName,
          email: user.email,
          photoURL: avatarUrl,
          createdAt: new Date(),
        });

        router.push("/todo");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/todo");
      }
    } catch (error: unknown) {
      if (error && typeof error === "object" && "code" in error) {
        const firebaseError = error as { code: string };
        if (firebaseError.code === "auth/user-not-found") {
          setErrorMsg("No account found. Please sign up first.");
        } else if (firebaseError.code === "auth/wrong-password") {
          setErrorMsg("Incorrect password. Please try again.");
        } else if (firebaseError.code === "auth/email-already-in-use") {
          setErrorMsg("Email is already in use.");
        } else {
          setErrorMsg("Something went wrong. Please try again.");
        }
      } else {
        setErrorMsg("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        let firstName = "User";
        let lastName = "";

        if (user.displayName && user.displayName.trim()) {
          const nameParts = user.displayName.trim().split(" ");
          firstName = nameParts[0] || "User";
          if (nameParts.length > 1) {
            lastName = nameParts.slice(1).join(" ");
          }
        }

        const avatarSeed = lastName ? `${firstName}+${lastName}` : firstName;
        const avatarUrl =
          user.photoURL ||
          `https://api.dicebear.com/6.x/adventurer-neutral/svg?seed=${avatarSeed}`;

        await setDoc(userRef, {
          uid: user.uid,
          firstName: firstName,
          lastName: lastName,
          email: user.email,
          photoURL: avatarUrl,
          createdAt: new Date(),
        });
      }

      router.push("/todo");
    } catch (error: unknown) {
      console.error("Google sign-in error:", error);
      setErrorMsg("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-y-auto">
      {/* Logo */}
      <div className="logo absolute top-4 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-4">
        <Image
          src="/images/Logo.svg"
          alt="Toddler Logo"
          width={200}
          height={200}
          className="logo-img"
        />
      </div>

      {/* Form container */}
      <div className="form-box w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-10 relative">
        <h2 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 text-center">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-300">
          {mode === "signup" ? "Sign up to get started" : "Sign in to continue"}
        </p>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <InfiniteWalkingLoader />
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LabelInputContainer>
                  <Label htmlFor="firstname">First name</Label>
                  <Input id="firstname" placeholder="Rahul" type="text" />
                </LabelInputContainer>
                <LabelInputContainer>
                  <Label htmlFor="lastname">Last name</Label>
                  <Input id="lastname" placeholder="Singh" type="text" />
                </LabelInputContainer>
              </div>
            )}

            <LabelInputContainer>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                placeholder="rahul-singh@gmail.com"
                type="email"
                required
              />
            </LabelInputContainer>

            <LabelInputContainer>
              <Label htmlFor="password">Password</Label>
              <div className="relative w-full">
                <Input
                  id="password"
                  placeholder={
                    showPassword ? "I Can see your password" : "••••••••"
                  }
                  type={showPassword ? "text" : "password"}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </LabelInputContainer>

            {errorMsg && (
              <p className="text-red-500 text-sm text-center">{errorMsg}</p>
            )}

            <button
              className="group/btn relative block h-12 w-full rounded-md bg-gradient-to-br from-black to-neutral-600 font-medium text-white text-lg shadow-md dark:from-zinc-900 dark:to-zinc-800"
              type="submit"
            >
              {mode === "signup" ? "Sign up →" : "Sign in →"}
              <BottomGradient />
            </button>

            <div className="my-6 h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent dark:via-neutral-700" />

            <div className="flex justify-center">
              <OAuthButton
                icon={<IconBrandGoogle />}
                label="Continue with Google"
                onClick={handleGoogleLogin}
              />
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-300">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button
                onClick={() => {
                  setMode("signin");
                  setErrorMsg("");
                }}
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setErrorMsg("");
                }}
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Sign up
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

const OAuthButton = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className="group/btn flex h-10 items-center justify-center space-x-2 rounded-md bg-gray-50 px-4 font-medium text-black shadow-sm dark:bg-zinc-800 dark:text-white"
    type="button"
  >
    {icon}
    <span className="text-sm">{label}</span>
  </button>
);

const BottomGradient = () => (
  <>
    <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
    <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
  </>
);

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("flex w-full flex-col space-y-2", className)}>{children}</div>
);
