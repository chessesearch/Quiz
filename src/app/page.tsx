"use client";

import { useEffect, useState } from "react";
import { useQuizStore } from "@/store/quizStore";
import Sidebar from "@/components/Sidebar";
import StartScreen from "@/components/StartScreen";
import MainQuiz from "@/components/MainQuiz";
import ResultScreen from "@/components/ResultScreen";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export default function Home() {
  const state = useQuizStore((state) => state.state);
  const theme = useQuizStore((state) => state.theme);
  const isSettingsOpen = useQuizStore((state) => state.isSettingsOpen);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // We use suppressHydrationWarning in layout.tsx to handle mismatches

  return (
    <div className={cn(
      "flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300"
    )}>
      <main className="flex-1 flex flex-col relative overflow-y-auto md:overflow-hidden h-full">
        {state === "NOT_STARTED" && <StartScreen />}
        {state === "IN_PROGRESS" && <MainQuiz />}
        {state === "COMPLETED" && <ResultScreen />}
      </main>
      
      <AnimatePresence>
        {state === "NOT_STARTED" && isSettingsOpen && (
          <motion.div 
            key="settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-900/60 flex items-center justify-center p-4 md:p-8"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col relative transition-colors duration-300"
            >
              <Sidebar />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
