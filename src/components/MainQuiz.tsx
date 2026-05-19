"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuizStore } from "@/store/quizStore";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Pause, Play, LogOut, CheckSquare } from "lucide-react";

const Timer = () => {
  const startTime = useQuizStore(state => state.startTime);
  const isPaused = useQuizStore(state => state.isPaused);
  const accumulatedTime = useQuizStore(state => state.accumulatedTime);
  const [elapsedTime, setElapsedTime] = useState(0);

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

  return <>{formatTime(elapsedTime)}</>;
};

export default function MainQuiz() {
  const {
    questions,
    currentIndex,
    answers,
    submitAnswer,
    nextQuestion,
    showResultAfterQuestion,
    autoNext,
    isPaused,
    pauseQuiz,
    resumeQuiz,
    exitQuiz,
    submitQuizEarly
  } = useQuizStore();

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isInputLocked, setIsInputLocked] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const question = questions[currentIndex];
  const total = questions.length;
  const progress = ((currentIndex) / total) * 100;

  useEffect(() => {
    // Reset local state when question changes
    setSelectedOptionId(null);
    setShowFeedback(false);
    setIsInputLocked(false);
  }, [currentIndex]);

  const handleSelectOption = useCallback((optionId: string) => {
    if (showFeedback || isInputLocked) return; // Prevent selection when feedback is showing or locked

    setSelectedOptionId(optionId);

    if (autoNext) {
      setIsInputLocked(true);
      submitAnswer(question.id, optionId);
      if (showResultAfterQuestion) {
        setShowFeedback(true);
        setTimeout(() => {
          nextQuestion();
        }, 1500); // Wait 1.5s to show feedback
      } else {
        setTimeout(() => {
          nextQuestion();
        }, 250); // Delay moving to let selection animation be visible and prevent spamming
      }
    }
  }, [showFeedback, isInputLocked, autoNext, submitAnswer, question.id, showResultAfterQuestion, nextQuestion]);

  const handleEnter = useCallback(() => {
    if (!selectedOptionId || isInputLocked) return;
    if (autoNext) return; // Already handled on click

    if (!showFeedback) {
      setIsInputLocked(true);
      submitAnswer(question.id, selectedOptionId);
      if (showResultAfterQuestion) {
        setShowFeedback(true);
        setTimeout(() => {
          setIsInputLocked(false);
        }, 300); // Allow next input confirmation after a short delay
      } else {
        nextQuestion();
      }
    } else {
      setIsInputLocked(true);
      nextQuestion();
    }
  }, [selectedOptionId, autoNext, showFeedback, submitAnswer, question.id, showResultAfterQuestion, nextQuestion, isInputLocked]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || showExitConfirm || showSubmitConfirm || isInputLocked) return;

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
  }, [handleEnter, showFeedback, question, handleSelectOption, selectedOptionId, isPaused, isInputLocked, showExitConfirm, showSubmitConfirm]);

  if (!question) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative transition-colors duration-300">
      <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 sticky top-0 z-10">
        <motion.div 
          className="h-full bg-indigo-600 dark:bg-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <header className="px-4 md:px-8 py-3 md:py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm sticky top-1 z-10 transition-colors duration-300">
        <div className="flex items-center gap-2 md:gap-6">
          <div className="text-xs md:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center">
            <span className="hidden sm:inline mr-1">Câu hỏi</span>
            <span className="sm:hidden mr-1">Câu</span>
            <span className="text-indigo-600 dark:text-indigo-400 text-base md:text-lg mx-1">{currentIndex + 1}</span> / {total}
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-slate-700 dark:text-slate-300 font-medium text-xs md:text-sm">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500 dark:text-slate-400" />
            <Timer />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg font-medium transition-colors text-xs md:text-sm"
          >
            <CheckSquare className="w-4 h-4 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Nộp bài</span>
          </button>
          <button
            onClick={pauseQuiz}
            className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors text-xs md:text-sm"
          >
            <Pause className="w-4 h-4 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Tạm dừng</span>
          </button>
          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors text-xs md:text-sm"
          >
            <LogOut className="w-4 h-4 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Thoát</span>
          </button>
        </div>
      </header>

      {isPaused && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-slate-100 dark:border-slate-700">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Pause className="w-8 h-8" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Đã tạm dừng</h2>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mb-8">Thời gian đã được dừng lại. Bạn có thể tiếp tục bất cứ lúc nào.</p>
            
            <div className="space-y-3">
              <button
                onClick={resumeQuiz}
                className="w-full flex justify-center items-center gap-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white py-3 px-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-95 text-sm md:text-base"
              >
                <Play className="w-5 h-5 fill-current" />
                Tiếp tục làm bài
              </button>
              <button
                onClick={() => setShowExitConfirm(true)}
                className="w-full flex justify-center items-center gap-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 py-3 px-4 rounded-xl font-bold transition-all active:scale-95 text-sm md:text-base"
              >
                <LogOut className="w-5 h-5" />
                Thoát
              </button>
            </div>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div className="absolute inset-0 z-[60] bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-slate-100 dark:border-slate-700">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-8 h-8" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Thoát làm bài?</h2>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mb-8">Kết quả hiện tại của bạn sẽ không được lưu lại. Bạn có chắc chắn muốn thoát?</p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 py-3 px-4 rounded-xl font-bold transition-all active:scale-95 text-sm md:text-base"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  exitQuiz();
                }}
                className="flex-1 bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white py-3 px-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-95 text-sm md:text-base"
              >
                Thoát ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubmitConfirm && (
        <div className="absolute inset-0 z-[60] bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-slate-100 dark:border-slate-700">
            <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="w-8 h-8" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Nộp bài sớm?</h2>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mb-8">Bạn sẽ kết thúc phiên làm bài tại đây và xem kết quả ngay lập tức.</p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 py-3 px-4 rounded-xl font-bold transition-all active:scale-95 text-sm md:text-base"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setShowSubmitConfirm(false);
                  submitQuizEarly();
                }}
                className="flex-1 bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white py-3 px-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-95 text-sm md:text-base"
              >
                Nộp bài
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 md:py-12 flex justify-center">
        <div className="max-w-3xl w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={question.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-xl md:text-2xl leading-relaxed text-slate-900 dark:text-slate-100 font-medium mb-6 md:mb-8 whitespace-pre-wrap">
                {question.text}
              </h2>

              <div className="space-y-3 md:space-y-4">
                {question.options.map((option, idx) => {
                  const isSelected = selectedOptionId === option.id;
                  const isCorrect = option.id === question.correctOptionId;
                  
                  let stateClass = "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 bg-white dark:bg-slate-800";
                  let textClass = "text-slate-700 dark:text-slate-300";
                  let letterClass = "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400";

                  if (showFeedback) {
                    if (isCorrect) {
                      stateClass = "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-[0_0_0_2px_rgba(34,197,94,0.2)]";
                      textClass = "text-green-800 dark:text-green-400 font-medium";
                      letterClass = "bg-green-500 text-white";
                    } else if (isSelected && !isCorrect) {
                      stateClass = "border-red-500 bg-red-50 dark:bg-red-900/20 shadow-[0_0_0_2px_rgba(239,68,68,0.2)]";
                      textClass = "text-red-800 dark:text-red-400 font-medium";
                      letterClass = "bg-red-500 text-white";
                    }
                  } else if (isSelected) {
                    stateClass = "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-[0_0_0_2px_rgba(79,70,229,0.2)]";
                    textClass = "text-indigo-900 dark:text-indigo-300 font-medium";
                    letterClass = "bg-indigo-600 text-white";
                  }

                  const labels = ['A', 'B', 'C', 'D'];

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelectOption(option.id)}
                      disabled={showFeedback || isInputLocked}
                      className={cn(
                        "w-full text-left p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all duration-200 flex items-start gap-3 md:gap-4",
                        stateClass,
                        (showFeedback || isInputLocked) ? "cursor-default" : "cursor-pointer active:scale-[0.99]"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0 text-xs md:text-sm font-bold transition-colors",
                        letterClass
                      )}>
                        {labels[idx]}
                      </div>
                      <div className={cn("pt-0.5 md:pt-1 leading-relaxed text-sm md:text-base", textClass)}>
                        {option.text}
                      </div>
                    </button>
                  );
                })}
              </div>

              {!autoNext && (
                <div className="mt-6 md:mt-8 flex justify-end">
                  <button
                    onClick={handleEnter}
                    disabled={!selectedOptionId || isInputLocked}
                    className="bg-slate-900 dark:bg-indigo-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-medium transition-all hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center gap-2 text-sm md:text-base"
                  >
                    {showFeedback ? "Câu tiếp theo" : "Xác nhận"}
                    <span className="text-slate-400 dark:text-indigo-200 text-xs md:text-sm font-normal ml-1 md:ml-2">↵ Enter</span>
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
