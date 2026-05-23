"use client";

import { useEffect } from "react";
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

  // Load settings and sources from localStorage on mount (client-side only to prevent SSR mismatch)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSources = localStorage.getItem("vapas_quiz_sources");
      const savedSettings = localStorage.getItem("vapas_quiz_settings");
      if (savedSources) {
        try {
          const parsed = JSON.parse(savedSources);
          useQuizStore.setState({ sources: parsed });
        } catch (e) {
          console.error("Error loading sources:", e);
        }
      }
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          useQuizStore.setState(parsed);
        } catch (e) {
          console.error("Error loading settings:", e);
        }
      }
    }
  }, []);

  // Save settings and sources to localStorage when they change, ignoring timer ticks
  useEffect(() => {
    let lastSourcesStr = "";
    let lastSettingsStr = "";
    
    const unsub = useQuizStore.subscribe((state) => {
      const sourcesStr = JSON.stringify(state.sources);
      const settingsObj = {
        showResultAfterQuestion: state.showResultAfterQuestion,
        autoNext: state.autoNext,
        questionCountMode: state.questionCountMode,
        customQuestionCount: state.customQuestionCount,
        sourceAllocations: state.sourceAllocations,
        theme: state.theme,
      };
      const settingsStr = JSON.stringify(settingsObj);
      
      if (sourcesStr !== lastSourcesStr) {
        localStorage.setItem("vapas_quiz_sources", sourcesStr);
        lastSourcesStr = sourcesStr;
      }
      if (settingsStr !== lastSettingsStr) {
        localStorage.setItem("vapas_quiz_settings", settingsStr);
        lastSettingsStr = settingsStr;
      }
    });
    return unsub;
  }, []);

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
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ willChange: "opacity" }}
            className="fixed inset-0 z-[60] bg-slate-900/60 flex items-center justify-center p-4 md:p-8"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ willChange: "transform, opacity" }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col relative transition-colors duration-200"
            >
              <Sidebar />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
