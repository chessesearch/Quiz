"use client";

import { useQuizStore } from "@/store/quizStore";
import { Play } from "lucide-react";
import { motion } from "framer-motion";

export default function StartScreen() {
  const { sources, startQuiz } = useQuizStore();
  const activeSources = sources.filter(s => s.active && s.isValid);
  const totalQuestions = activeSources.reduce((acc, curr) => acc + curr.questionsCount, 0);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center border border-slate-100"
      >
        <div className="w-20 h-20 bg-indigo-50 rounded-2xl mx-auto flex items-center justify-center mb-6">
          <Play className="w-10 h-10 text-indigo-600 ml-1" />
        </div>
        
        <h1 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Chuẩn bị làm bài</h1>
        
        <p className="text-slate-500 mb-8 leading-relaxed">
          Vui lòng chọn các nguồn dữ liệu ở cột bên phải. Hệ thống sẽ trộn các câu hỏi và lựa chọn để bắt đầu.
        </p>

        <div className="bg-slate-50 rounded-2xl p-5 mb-8 flex justify-around">
          <div>
            <div className="text-3xl font-bold text-slate-800">{activeSources.length}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Tệp chọn</div>
          </div>
          <div className="w-px bg-slate-200"></div>
          <div>
            <div className="text-3xl font-bold text-indigo-600">{totalQuestions}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Câu hỏi</div>
          </div>
        </div>

        <button
          onClick={startQuiz}
          disabled={totalQuestions === 0}
          className="w-full bg-indigo-600 text-white font-bold text-lg py-4 px-8 rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/30 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transform active:scale-[0.98]"
        >
          Bắt đầu
        </button>
      </motion.div>
    </div>
  );
}
