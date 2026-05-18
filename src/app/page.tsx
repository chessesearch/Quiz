"use client";

import { useQuizStore } from "@/store/quizStore";
import Sidebar from "@/components/Sidebar";
import StartScreen from "@/components/StartScreen";
import MainQuiz from "@/components/MainQuiz";
import ResultScreen from "@/components/ResultScreen";

export default function Home() {
  const state = useQuizStore((state) => state.state);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {state === "NOT_STARTED" && <StartScreen />}
        {state === "IN_PROGRESS" && <MainQuiz />}
        {state === "COMPLETED" && <ResultScreen />}
      </main>
      
      {state === "NOT_STARTED" && (
        <aside className="w-96 border-l border-slate-200 bg-white flex flex-col h-full shadow-xl z-10">
          <Sidebar />
        </aside>
      )}
    </div>
  );
}
