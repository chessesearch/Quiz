"use client";

import { useEffect, useState } from "react";
import { useQuizStore } from "@/store/quizStore";
import Sidebar from "@/components/Sidebar";
import StartScreen from "@/components/StartScreen";
import MainQuiz from "@/components/MainQuiz";
import ResultScreen from "@/components/ResultScreen";
import { cn } from "@/lib/utils";

export default function Home() {
  const state = useQuizStore((state) => state.state);
  const theme = useQuizStore((state) => state.theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (!mounted) return null;

  return (
    <div className={cn(
      "flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300",
      state === "NOT_STARTED" ? "flex-col md:flex-row h-screen overflow-hidden" : "flex-col h-screen overflow-hidden"
    )}>
      <main className="flex-1 flex flex-col relative overflow-y-auto md:overflow-hidden min-h-[50vh]">
        {state === "NOT_STARTED" && <StartScreen />}
        {state === "IN_PROGRESS" && <MainQuiz />}
        {state === "COMPLETED" && <ResultScreen />}
      </main>
      
      {state === "NOT_STARTED" && (
        <aside className="w-full md:w-96 border-t md:border-l md:border-t-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 md:h-full h-[50vh] shadow-xl z-10 transition-colors duration-300">
          <Sidebar />
        </aside>
      )}
    </div>
  );
}
