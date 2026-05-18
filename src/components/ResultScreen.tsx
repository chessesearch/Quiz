"use client";

import { useQuizStore } from "@/store/quizStore";
import { CheckCircle2, XCircle, RotateCcw, Clock, Target, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function ResultScreen() {
  const { questions, answers, totalTime, retryQuiz, resetApp } = useQuizStore();

  const total = questions.length;
  let correctCount = 0;
  const incorrectQuestions = [];

  for (const q of questions) {
    if (answers[q.id] === q.correctOptionId) {
      correctCount++;
    } else {
      incorrectQuestions.push(q);
    }
  }

  const score10 = total > 0 ? parseFloat(((correctCount / total) * 10).toFixed(2)) : 0;
  const totalSeconds = totalTime ? Math.floor(totalTime / 1000) : 0;
  const avgTime = total > 0 ? (totalSeconds / total).toFixed(1) : "0";

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 md:p-8 lg:p-12 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700 text-center transition-colors duration-300"
        >
          <div className="inline-flex items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full mb-6">
            <Target className="w-12 h-12" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">Hoàn thành bài kiểm tra!</h1>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mb-8">Dưới đây là kết quả chi tiết của bạn.</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 md:p-6 rounded-2xl">
              <div className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Điểm số</div>
              <div className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">{score10}</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 md:p-6 rounded-2xl">
              <div className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Chính xác</div>
              <div className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">{correctCount}<span className="text-base md:text-lg text-slate-400 dark:text-slate-500">/{total}</span></div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 md:p-6 rounded-2xl">
              <div className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Thời gian</div>
              <div className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">{formatTime(totalSeconds)}</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 md:p-6 rounded-2xl">
              <div className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Trung bình/câu</div>
              <div className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">{avgTime}s</div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-center gap-3 md:gap-4 mt-8">
            <button
              onClick={retryQuiz}
              className="flex items-center justify-center gap-2 bg-indigo-600 dark:bg-indigo-500 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold transition-all hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-md hover:shadow-lg active:scale-95 text-sm md:text-base"
            >
              <RotateCcw className="w-5 h-5" />
              Làm lại bài
            </button>
            <button
              onClick={resetApp}
              className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 text-sm md:text-base"
            >
              Quay lại trang chủ
            </button>
          </div>
        </motion.div>

        {incorrectQuestions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4 md:space-y-6"
          >
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 px-2">
              <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
              <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100">Các câu trả lời sai cần xem lại</h2>
            </div>

            <div className="space-y-4">
              {incorrectQuestions.map((q, idx) => {
                const selectedOption = q.options.find(o => o.id === answers[q.id]);
                const correctOption = q.options.find(o => o.id === q.correctOptionId);

                return (
                  <div key={q.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
                    <div className="font-medium text-slate-900 dark:text-slate-100 mb-4 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                      <span className="text-slate-400 dark:text-slate-500 mr-2">#{idx + 1}</span>
                      {q.text}
                    </div>
                    
                    <div className="space-y-3">
                      {selectedOption ? (
                        <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/50">
                          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-red-500 mb-1">Bạn chọn</div>
                            <div className="text-sm md:text-base">{selectedOption.text}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 p-3 bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-600/50">
                          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-slate-500 dark:text-slate-400" />
                          <div>
                            <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Trạng thái</div>
                            <div className="text-sm md:text-base">Chưa trả lời</div>
                          </div>
                        </div>
                      )}
                      
                      {correctOption && (
                        <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-xl border border-green-100 dark:border-green-900/50">
                          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-500 mb-1">Đáp án đúng</div>
                            <div className="text-sm md:text-base">{correctOption.text}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
