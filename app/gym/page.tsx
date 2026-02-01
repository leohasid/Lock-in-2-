"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GymPage() {
  const router = useRouter();
  
  // Redirect to workout page
  useEffect(() => {
    router.replace("/gym/workout");
  }, [router]);
  
  return null;
}
