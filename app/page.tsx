'use client';
import { div } from "motion/react-client";
import { useRouter } from "next/navigation";
import  AuthForm  from "./signup-signin/page";

export default function Home() {
  return (
    <div>
      <AuthForm></AuthForm>
    </div>
  )
}