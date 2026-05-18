"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuizStore } from "@/store/quizStore";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Pause, Play, LogOut, CheckSquare } from "lucide-react";

export default function MainQuiz() {
  const {
    questions,
    currentIndex,
    answers,
    submitAnswer,
    nextQuestion,
    showResultAfterQuestion,
    autoNext,
    startTime,
    isPaused,
    accumulatedTime,
    pauseQuiz,
    resumeQuiz,
    exitQuiz,
    submitQuizEarly
  } = useQuizStore();

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const question = questions[currentIndex];
  const total = questions.length;
  const progress = ((currentIndex) / total) * 100;

  useEffect(() => {
    // Reset local state when question changes
    setSelectedOptionId(null);
    setShowFeedback(false);
  }, [currentIndex]);

  useEffect(() => {
    const updateTime = () => {
      const currentSessionTime = startTime && !isPaused ? Date.now() - startTime : 0;
      setElapsedTime(Math.floor((accumulatedTime + currentSessionTime) / 1000));
    };
    updateTime();

    let interval: NodeJS.Timeout;
    if (startTime && !isPaused) {
      interval = setInterval(updateTime, 1000);
    }
    return () => clearInterval(interval);
  }, [startTime, isPaused, accumulatedTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSelectOption = useCallback((optionId: string) => {
    if (showFeedback) return; // Prevent changing after submitted and waiting for next

    setSelectedOptionId(optionId);

    if (autoNext) {
      submitAnswer(question.id, optionId);
      if (showResultAfterQuestion) {
        setShowFeedback(true);
        setTimeout(() => {
          nextQuestion();
        }, 1500); // Wait 1.5s to show feedback
      } else {
        nextQuestion();
      }
    }
  }, [showFeedback, autoNext, submitAnswer, question.id, showResultAfterQuestion, nextQuestion]);

  const handleEnter = useCallback(() => {
    if (!selectedOptionId) return;
    if (autoNext) return; // Already handled on click

    if (!showFeedback) {
      submitAnswer(question.id, selectedOptionId);
      if (showResultAfterQuestion) {
        setShowFeedback(true);
      } else {
        nextQuestion();
      }
    } else {
      nextQuestion();
    }
  }, [selectedOptionId, autoNext, showFeedback, submitAnswer, question.id, showResultAfterQuestion, nextQuestion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || showExitConfirm || showSubmitConfirm) return;

      if (e.key === "Enter") {
        e.preventDefault();
        handleEnter();
      } else if (!showFeedback && question.options) {
        const key = e.key.toLowerCase();
        const letters = ['a', 'b', 'c', 'd'];
        const letterIndex = letters.indexOf(key);
        if (letterIndex !== -1 && letterIndex < question.options.length) {
          handleSelectOption(question.options[letterIndex].id);
        } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
           e.preventDefault();
           const currentIdx = question.options.findIndex(opt => opt.id === selectedOptionId);
           let newIdx = 0;
           if (currentIdx !== -1) {
              if (e.key === "ArrowDown") newIdx = (currentIdx + 1) % question.options.length;
              if (e.key === "ArrowUp") newIdx = (currentIdx - 1 + question.options.length) % question.options.length;
           }
           setSelectedOptionId(question.options[newIdx].id);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleEnter, showFeedback, question, handleSelectOption, selectedOptionId, isPaused]);

  if (!question) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
      <div className="w-full h-1 bg-slate-200 sticky top-0 z-10">
        <motion.div 
          className="h-full bg-indigo-600"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <header className="px-8 py-4 flex justify-between items-center border-b border-slate-200 bg-white shadow-sm sticky top-1 z-10">
        <div className="flex items-center gap-6">
          <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">
            Câu hỏi <span className="text-indigo-600 text-lg mx-1">{currentIndex + 1}</span> / {total}
          </div>
          <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full text-slate-700 font-medium">
            <Clock className="w-4 h-4 text-slate-500" />
            {formatTime(elapsedTime)}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium transition-colors"
          >
            <CheckSquare className="w-4 h-4" />
            Nộp bài
          </button>
          <button
            onClick={pauseQuiz}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
          >
            <Pause className="w-4 h-4" />
            Tạm dừng
          </button>
          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Thoát
          </button>
        </div>
      </header>

      {isPaused && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-slate-100">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Pause className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Đã tạm dừng</h2>
            <p className="text-slate-500 mb-8">Thời gian đã được dừng lại. Bạn có thể tiếp tục bất cứ lúc nào.</p>
            
            <div className="space-y-3">
              <button
                onClick={resumeQuiz}
                className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                Tiếp tục làm bài
              </button>
              <button
                onClick={() => setShowExitConfirm(true)}
                className="w-full flex justify-center items-center gap-2 bg-white border-2 border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-700 hover:text-red-600 py-3 px-4 rounded-xl font-bold transition-all active:scale-95"
              >
                <LogOut className="w-5 h-5" />
                Thoát
              </button>
            </div>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div className="absolute inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-slate-100">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Thoát làm bài?</h2>
            <p className="text-slate-500 mb-8">Kết quả hiện tại của bạn sẽ không được lưu lại. Bạn có chắc chắn muốn thoát?</p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-4 rounded-xl font-bold transition-all active:scale-95"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  exitQuiz();
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                Thoát ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubmitConfirm && (
        <div className="absolute inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-slate-100">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Nộp bài sớm?</h2>
            <p className="text-slate-500 mb-8">Bạn sẽ kết thúc phiên làm bài tại đây và xem kết quả ngay lập tức.</p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-4 rounded-xl font-bold transition-all active:scale-95"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setShowSubmitConfirm(false);
                  submitQuizEarly();
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                Nộp bài
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-8 py-12 flex justify-center">
        <div className="max-w-3xl w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={question.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-2xl leading-relaxed text-slate-900 font-medium mb-8 whitespace-pre-wrap">
                {question.text}
              </h2>

              <div className="space-y-4">
                {question.options.map((option, idx) => {
                  const isSelected = selectedOptionId === option.id;
                  const isCorrect = option.id === question.correctOptionId;
                  
                  let stateClass = "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 bg-white";
                  let textClass = "text-slate-700";
                  let letterClass = "bg-slate-100 text-slate-500";

                  if (showFeedback) {
                    if (isCorrect) {
                      stateClass = "border-green-500 bg-green-50 shadow-[0_0_0_2px_rgba(34,197,94,0.2)]";
                      textClass = "text-green-800 font-medium";
                      letterClass = "bg-green-500 text-white";
                    } else if (isSelected && !isCorrect) {
                      stateClass = "border-red-500 bg-red-50 shadow-[0_0_0_2px_rgba(239,68,68,0.2)]";
                      textClass = "text-red-800 font-medium";
                      letterClass = "bg-red-500 text-white";
                    }
                  } else if (isSelected) {
                    stateClass = "border-indigo-600 bg-indigo-50 shadow-[0_0_0_2px_rgba(79,70,229,0.2)]";
                    textClass = "text-indigo-900 font-medium";
                    letterClass = "bg-indigo-600 text-white";
                  }

                  const labels = ['A', 'B', 'C', 'D'];

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelectOption(option.id)}
                      disabled={showFeedback}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4",
                        stateClass,
                        showFeedback ? "cursor-default" : "cursor-pointer active:scale-[0.99]"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold transition-colors",
                        letterClass
                      )}>
                        {labels[idx]}
                      </div>
                      <div className={cn("pt-1 leading-relaxed", textClass)}>
                        {option.text}
                      </div>
                    </button>
                  );
                })}
              </div>

              {!autoNext && (
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleEnter}
                    disabled={!selectedOptionId}
                    className="bg-slate-900 text-white px-8 py-4 rounded-xl font-medium transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center gap-2"
                  >
                    {showFeedback ? "Câu tiếp theo" : "Xác nhận"}
                    <span className="text-slate-400 text-sm font-normal ml-2">↵ Enter</span>
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
