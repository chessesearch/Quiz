"use client";

import { useQuizStore } from "@/store/quizStore";
import { Play } from "lucide-react";
import { motion } from "framer-motion";

export default function StartScreen() {
  const { sources, startQuiz } = useQuizStore();
  const activeSources = sources.filter(s => s.active && s.isValid);
  const totalQuestions = activeSources.reduce((acc, curr) => acc + curr.questionsCount, 0);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] text-center border border-slate-100 dark:border-slate-700 transition-colors duration-300"
      >
        <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl mx-auto flex items-center justify-center mb-6">
          <Play className="w-8 h-8 md:w-10 md:h-10 text-indigo-600 dark:text-indigo-400 ml-1" />
        </div>
        
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-3 md:mb-4 tracking-tight">Chuẩn bị làm bài</h1>
        
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          Vui lòng chọn các nguồn dữ liệu ở cột cài đặt. Hệ thống sẽ trộn các câu hỏi và lựa chọn để bắt đầu.
        </p>

        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 md:p-5 mb-8 flex justify-around">
          <div>
            <div className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200">{activeSources.length}</div>
            <div className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Tệp chọn</div>
          </div>
          <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600 dark:text-indigo-400">{totalQuestions}</div>
            <div className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Câu hỏi</div>
          </div>
        </div>

        <button
          onClick={startQuiz}
          disabled={totalQuestions === 0}
          className="w-full bg-indigo-600 dark:bg-indigo-500 text-white font-bold text-base md:text-lg py-3 md:py-4 px-8 rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/30 dark:hover:shadow-indigo-900/30 hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transform active:scale-[0.98]"
        >
          Bắt đầu
        </button>
      </motion.div>
    </div>
  );
}
