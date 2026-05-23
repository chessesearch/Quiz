"use client";

import { useEffect, useState, useCallback, memo, useRef } from "react";
import { useQuizStore } from "@/store/quizStore";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Pause, Play, LogOut, CheckSquare, AlertTriangle, CheckCircle } from "lucide-react";
import { isQuestionCorrect, Question } from "@/lib/parser";

import { DisplayBlockRenderer } from "@/components/DisplayBlockRenderer";

const Timer = memo(() => {
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
});
Timer.displayName = "Timer";

const AUTO_NEXT_DELAY_MS = 1000;

type QuizPhase = 'answering' | 'feedback' | 'transitioning';

interface QuestionCardProps {
  question: Question;
  currentIndex: number;
  showResultAfterQuestion: boolean;
  autoNext: boolean;
  isPaused: boolean;
  showExitConfirm: boolean;
  setShowExitConfirm: (val: boolean) => void;
  showSubmitConfirm: boolean;
  setShowSubmitConfirm: (val: boolean) => void;
  resumeQuiz: () => void;
  pauseQuiz: () => void;
  submitAnswer: (questionId: string, optionIds: string[]) => void;
  nextQuestion: () => void;
  onQuestionActive: (index: number) => void;
}

const QuestionCard = memo(function QuestionCard({
  question: initialQuestion,
  currentIndex: initialCurrentIndex,
  showResultAfterQuestion,
  autoNext,
  isPaused,
  showExitConfirm,
  setShowExitConfirm,
  showSubmitConfirm,
  setShowSubmitConfirm,
  resumeQuiz,
  pauseQuiz,
  submitAnswer,
  nextQuestion,
  onQuestionActive
}: QuestionCardProps) {
  const [question] = useState(initialQuestion);
  const [currentIndex] = useState(initialCurrentIndex);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [phase, setPhase] = useState<QuizPhase>('transitioning');
  const isLockedRef = useRef(true);
  const autoNextTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentAnswer = question.type === "multiple_choice" ? selectedOptionIds : (selectedOptionId ? [selectedOptionId] : []);
  const isCorrect = isQuestionCorrect(question, currentAnswer);

  const clearAutoNextTimeout = useCallback(() => {
    if (autoNextTimeoutRef.current) {
      clearTimeout(autoNextTimeoutRef.current);
      autoNextTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    onQuestionActive(currentIndex);
  }, [currentIndex, onQuestionActive]);

  useEffect(() => {
    return () => {
      clearAutoNextTimeout();
    };
  }, [clearAutoNextTimeout]);

  const triggerNextQuestion = useCallback(() => {
    clearAutoNextTimeout();
    isLockedRef.current = true;
    setPhase('transitioning');
    nextQuestion();
  }, [nextQuestion, clearAutoNextTimeout]);

  const handleSelectOption = useCallback((optionId: string) => {
    if (phase !== 'answering' || isLockedRef.current) return;

    if (question.type === "multiple_choice") {
      setSelectedOptionIds(prev => {
        const next = prev.includes(optionId) 
          ? prev.filter(id => id !== optionId) 
          : [...prev, optionId];
        return next;
      });
      return;
    }

    setSelectedOptionId(optionId);

    if (autoNext) {
      isLockedRef.current = true;
      submitAnswer(question.id, [optionId]);
      const isCorrectNow = isQuestionCorrect(question, [optionId]);
      
      setIsSubmitted(true);

      if (showResultAfterQuestion) {
        if (isCorrectNow) {
          setPhase('transitioning');
          clearAutoNextTimeout();
          autoNextTimeoutRef.current = setTimeout(() => {
            triggerNextQuestion();
          }, AUTO_NEXT_DELAY_MS);
        } else {
          setPhase('feedback');
          isLockedRef.current = false;
        }
      } else {
        triggerNextQuestion();
      }
    }
  }, [phase, question, autoNext, showResultAfterQuestion, submitAnswer, triggerNextQuestion, clearAutoNextTimeout]);

  const handleEnter = useCallback(() => {
    const isMultiple = question.type === "multiple_choice";
    const currentAnswer = isMultiple ? selectedOptionIds : (selectedOptionId ? [selectedOptionId] : []);
    const hasSelection = currentAnswer.length > 0;

    if (!hasSelection || isLockedRef.current) return;

    if (phase === 'answering') {
      if (autoNext && !isMultiple) return;

      isLockedRef.current = true;
      submitAnswer(question.id, currentAnswer);
      const isCorrectNow = isQuestionCorrect(question, currentAnswer);

      setIsSubmitted(true);

      if (showResultAfterQuestion) {
        if (isCorrectNow && autoNext) {
          setPhase('transitioning');
          clearAutoNextTimeout();
          autoNextTimeoutRef.current = setTimeout(() => {
            triggerNextQuestion();
          }, AUTO_NEXT_DELAY_MS);
        } else {
          setPhase('feedback');
          isLockedRef.current = false;
        }
      } else {
        triggerNextQuestion();
      }
    } else if (phase === 'feedback') {
      triggerNextQuestion();
    }
  }, [question, selectedOptionId, selectedOptionIds, phase, autoNext, showResultAfterQuestion, submitAnswer, triggerNextQuestion, clearAutoNextTimeout]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInputActive = activeEl && (
        activeEl.tagName === "INPUT" || 
        activeEl.tagName === "TEXTAREA" || 
        activeEl.isContentEditable
      );
      if (isInputActive) return;

      if (e.key === "Escape") {
        e.preventDefault();
        
        if (showExitConfirm) {
          setShowExitConfirm(false);
        } else if (showSubmitConfirm) {
          setShowSubmitConfirm(false);
        } else if (isPaused) {
          resumeQuiz();
        } else {
          setShowExitConfirm(true);
        }
        return;
      }

      // Pause toggle shortcut: P key
      if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (isPaused) {
          resumeQuiz();
        } else {
          if (!showExitConfirm && !showSubmitConfirm) {
            pauseQuiz();
          }
        }
        return;
      }

      // Early submit shortcut: S key
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (phase === 'answering' && !isLockedRef.current && !isPaused && !showExitConfirm && !showSubmitConfirm) {
          setShowSubmitConfirm(true);
        }
        return;
      }

      if (isPaused || showExitConfirm || showSubmitConfirm || isLockedRef.current || phase === 'transitioning') return;

      if (e.key === "Enter") {
        e.preventDefault();
        handleEnter();
      } else if (phase === 'answering' && question.options) {
        const key = e.key.toLowerCase();
        const letters = ['a', 'b', 'c', 'd'];
        const letterIndex = letters.indexOf(key);
        if (letterIndex !== -1 && letterIndex < question.options.length) {
          handleSelectOption(question.options[letterIndex].id);
        } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
           e.preventDefault();
           if (question.type !== "multiple_choice") {
             const currentIdx = question.options.findIndex(opt => opt.id === selectedOptionId);
             let newIdx = 0;
             if (currentIdx !== -1) {
                if (e.key === "ArrowDown") newIdx = (currentIdx + 1) % question.options.length;
                if (e.key === "ArrowUp") newIdx = (currentIdx - 1 + question.options.length) % question.options.length;
             }
             setSelectedOptionId(question.options[newIdx].id);
           }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleEnter, phase, question, handleSelectOption, selectedOptionId, selectedOptionIds, isPaused, showExitConfirm, showSubmitConfirm, resumeQuiz, pauseQuiz, setShowExitConfirm, setShowSubmitConfirm]);

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      onAnimationComplete={() => {
        if (phase === 'transitioning') {
          setPhase('answering');
          isLockedRef.current = false;
        }
      }}
    >
      <h2 className="text-xl md:text-2xl leading-relaxed text-slate-900 dark:text-slate-100 font-medium mb-6 md:mb-8 whitespace-pre-wrap">
        {question.text}
      </h2>

      {question.display_block && (
        <DisplayBlockRenderer block={question.display_block} />
      )}

      <div className="space-y-3 md:space-y-4">
        {question.options.map((option, idx) => {
          const isSelected = question.type === "multiple_choice"
            ? selectedOptionIds.includes(option.id)
            : selectedOptionId === option.id;
          
          const isOptionCorrect = question.correctOptionIds.includes(option.id);
          
          let stateClass = "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 bg-white dark:bg-slate-800";
          let textClass = "text-slate-700 dark:text-slate-300";
          let letterClass = "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-450";

          const showResultHighlights = showResultAfterQuestion && isSubmitted;

          if (showResultHighlights) {
            if (isOptionCorrect) {
              stateClass = "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-[0_0_0_2px_rgba(34,197,94,0.2)]";
              textClass = "text-green-800 dark:text-green-400 font-medium";
              letterClass = "bg-green-500 text-white";
            } else if (isSelected && !isOptionCorrect) {
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
              disabled={phase !== 'answering'}
              className={cn(
                "w-full text-left p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all duration-200 flex items-start gap-3 md:gap-4",
                stateClass,
                (phase !== 'answering') ? "cursor-default" : "cursor-pointer active:scale-[0.99]"
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

      {isSubmitted && showResultAfterQuestion && question.explanation && (() => {
        const InfoIcon = isCorrect ? CheckCircle : AlertTriangle;
        const explanationBg = isCorrect 
          ? "border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-950/20 text-green-800 dark:text-green-300"
          : "border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300";
        const explanationTitle = isCorrect
          ? "text-green-600 dark:text-green-400"
          : "text-amber-600 dark:text-amber-400";
        const iconColor = isCorrect ? "text-green-500" : "text-amber-500";

        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("mt-6 p-4 rounded-xl border flex gap-3 text-sm leading-relaxed", explanationBg)}
          >
            <InfoIcon className={cn("w-5 h-5 shrink-0 mt-0.5", iconColor)} />
            <div>
              <div className={cn("font-bold text-xs uppercase tracking-wider mb-1", explanationTitle)}>Giải thích</div>
              <div className="whitespace-pre-wrap">{question.explanation}</div>
            </div>
          </motion.div>
        );
      })()}

      {(() => {
        let showButton = false;
        let buttonText = "";
        let isButtonDisabled = false;

        if (!isSubmitted) {
          if (!autoNext || question.type === "multiple_choice") {
            showButton = true;
            buttonText = question.type === "multiple_choice" ? "Xác nhận đáp án" : "Xác nhận";
            const hasSelection = question.type === "multiple_choice" ? selectedOptionIds.length > 0 : selectedOptionId !== null;
            isButtonDisabled = !hasSelection || phase === 'transitioning';
          }
        } else {
          const isCorrectNow = isQuestionCorrect(question, currentAnswer);
          const willAutoAdvance = showResultAfterQuestion && isCorrectNow && autoNext;
          if (showResultAfterQuestion && !willAutoAdvance) {
            showButton = true;
            buttonText = "Câu tiếp theo";
            isButtonDisabled = phase === 'transitioning';
          }
        }

        if (!showButton) return null;

        return (
          <div className="mt-6 md:mt-8 pb-8 md:pb-12 flex justify-end">
            <button
              onClick={handleEnter}
              disabled={isButtonDisabled}
              className="bg-slate-900 dark:bg-indigo-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-medium transition-all hover:bg-slate-800 dark:hover:bg-indigo-750 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center gap-2 text-sm md:text-base cursor-pointer"
            >
              {buttonText}
              <span className="text-slate-400 dark:text-indigo-200 text-xs md:text-sm font-normal ml-1 md:ml-2">↵ Enter</span>
            </button>
          </div>
        );
      })()}
    </motion.div>
  );
});
QuestionCard.displayName = "QuestionCard";

const MainQuiz = memo(function MainQuiz() {
  const questions = useQuizStore(state => state.questions);
  const currentIndex = useQuizStore(state => state.currentIndex);
  const submitAnswer = useQuizStore(state => state.submitAnswer);
  const nextQuestion = useQuizStore(state => state.nextQuestion);
  const showResultAfterQuestion = useQuizStore(state => state.showResultAfterQuestion);
  const autoNext = useQuizStore(state => state.autoNext);
  const isPaused = useQuizStore(state => state.isPaused);
  const pauseQuiz = useQuizStore(state => state.pauseQuiz);
  const resumeQuiz = useQuizStore(state => state.resumeQuiz);
  const exitQuiz = useQuizStore(state => state.exitQuiz);
  const submitQuizEarly = useQuizStore(state => state.submitQuizEarly);

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const [activeCurrentIndex, setActiveCurrentIndex] = useState(currentIndex);

  useEffect(() => {
    if (currentIndex === 0) {
      setActiveCurrentIndex(0);
    }
  }, [currentIndex]);

  const question = questions[currentIndex];
  const total = questions.length;
  const progress = ((activeCurrentIndex) / total) * 100;

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
          <div className="text-xs md:text-sm font-bold text-slate-500 dark:text-slate-450 uppercase tracking-widest flex items-center">
            <span className="hidden sm:inline mr-1">Câu hỏi</span>
            <span className="sm:hidden mr-1">Câu</span>
            <span className="text-indigo-600 dark:text-indigo-400 text-base md:text-lg mx-1">{activeCurrentIndex + 1}</span> / {total}
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-slate-700 dark:text-slate-300 font-medium text-xs md:text-sm">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500 dark:text-slate-450" />
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
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-450 mb-8">Thời gian đã được dừng lại. Bạn có thể tiếp tục bất cứ lúc nào.</p>
            
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
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-450 mb-8">Kết quả hiện tại của bạn sẽ không được lưu lại. Bạn có chắc chắn muốn thoát?</p>
            
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
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-450 mb-8">Bạn sẽ kết thúc phiên làm bài tại đây và xem kết quả ngay lập tức.</p>
            
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

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-20 md:pt-10 md:pb-32 flex justify-center">
        <div className="max-w-3xl w-full pb-10 md:pb-16">
          <AnimatePresence mode="wait">
            <QuestionCard
              key={question.id}
              question={question}
              currentIndex={currentIndex}
              showResultAfterQuestion={showResultAfterQuestion}
              autoNext={autoNext}
              isPaused={isPaused}
              showExitConfirm={showExitConfirm}
              setShowExitConfirm={setShowExitConfirm}
              showSubmitConfirm={showSubmitConfirm}
              setShowSubmitConfirm={setShowSubmitConfirm}
              resumeQuiz={resumeQuiz}
              pauseQuiz={pauseQuiz}
              submitAnswer={submitAnswer}
              nextQuestion={nextQuestion}
              onQuestionActive={setActiveCurrentIndex}
            />
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});

export default MainQuiz;
