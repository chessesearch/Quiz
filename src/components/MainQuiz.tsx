"use client";

import { useEffect, useState, useCallback, memo } from "react";
import { useQuizStore } from "@/store/quizStore";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Pause, Play, LogOut, CheckSquare, AlertTriangle } from "lucide-react";
import { isQuestionCorrect } from "@/lib/parser";

import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/themes/prism-tomorrow.css";

function detectLanguage(code: string): string {
  const pythonKeywords = ["def ", "elif ", "import math", "print(", "len(", "range("];
  const jsKeywords = ["const ", "let ", "var ", "function ", "console.log", "=>"];
  
  let pyCount = 0;
  let jsCount = 0;
  
  pythonKeywords.forEach(k => {
    if (code.includes(k)) pyCount++;
  });
  jsKeywords.forEach(k => {
    if (code.includes(k)) jsCount++;
  });
  
  return pyCount >= jsCount ? "python" : "javascript";
}

function highlightCode(content: string): string[] {
  const lang = detectLanguage(content);
  const grammar = Prism.languages[lang] || Prism.languages.javascript;
  
  return content.split("\n").map(line => {
    if (!line) return "";
    return Prism.highlight(line, grammar, lang);
  });
}

const CodeBlock = memo(({ content }: { content: string }) => {
  const lines = content.split('\n');
  const highlightedLines = highlightCode(content);

  return (
    <div className="my-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 font-mono text-xs md:text-sm overflow-hidden transition-colors duration-300 shadow-inner">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700/50 bg-slate-100/50 dark:bg-slate-900/50 text-[10px] md:text-xs font-sans text-slate-400 select-none">
        <span>Code Block</span>
        <span className="text-[9px] uppercase tracking-wider bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-semibold">Read Only</span>
      </div>
      <div className="overflow-x-auto p-4 flex">
        <div className="text-right text-slate-450 select-none pr-4 border-r border-slate-200 dark:border-slate-700/50 mr-4 font-mono text-xs md:text-sm">
          {lines.map((_, i) => (
            <div key={i} className="leading-relaxed h-5">{i + 1}</div>
          ))}
        </div>
        <pre className="flex-1 text-slate-800 dark:text-slate-200 leading-relaxed font-mono text-xs md:text-sm overflow-visible whitespace-pre" style={{ tabSize: 4 }}>
          {highlightedLines.map((line, i) => (
            <div key={i} className="h-5" dangerouslySetInnerHTML={{ __html: line || ' ' }} />
          ))}
        </pre>
      </div>
    </div>
  );
});
CodeBlock.displayName = "CodeBlock";

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

const MainQuiz = memo(function MainQuiz() {
  const questions = useQuizStore(state => state.questions);
  const currentIndex = useQuizStore(state => state.currentIndex);
  const answers = useQuizStore(state => state.answers);
  const submitAnswer = useQuizStore(state => state.submitAnswer);
  const nextQuestion = useQuizStore(state => state.nextQuestion);
  const showResultAfterQuestion = useQuizStore(state => state.showResultAfterQuestion);
  const autoNext = useQuizStore(state => state.autoNext);
  const isPaused = useQuizStore(state => state.isPaused);
  const pauseQuiz = useQuizStore(state => state.pauseQuiz);
  const resumeQuiz = useQuizStore(state => state.resumeQuiz);
  const exitQuiz = useQuizStore(state => state.exitQuiz);
  const submitQuizEarly = useQuizStore(state => state.submitQuizEarly);

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isInputLocked, setIsInputLocked] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const question = questions[currentIndex];
  const total = questions.length;
  const progress = ((currentIndex) / total) * 100;

  const currentAnswer = question ? (question.type === "multiple_choice" ? selectedOptionIds : (selectedOptionId ? [selectedOptionId] : [])) : [];
  const isCorrect = question ? isQuestionCorrect(question, currentAnswer) : false;

  useEffect(() => {
    // Reset local state when question changes
    setSelectedOptionId(null);
    setSelectedOptionIds([]);
    setShowFeedback(false);
    setIsInputLocked(false);
  }, [currentIndex]);

  const handleSelectOption = useCallback((optionId: string) => {
    if (showFeedback || isInputLocked) return; // Prevent selection when feedback is showing or locked

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
      setIsInputLocked(true);
      submitAnswer(question.id, [optionId]);
      const isCorrectNow = isQuestionCorrect(question, [optionId]);
      
      if (isCorrectNow) {
        if (showResultAfterQuestion) {
          setShowFeedback(true);
          setTimeout(() => {
            nextQuestion();
          }, 1000); // 1s delay to show feedback highlighting
        } else {
          nextQuestion();
        }
      } else {
        setShowFeedback(true);
        setIsInputLocked(false); // Allow manual next
      }
    }
  }, [showFeedback, isInputLocked, autoNext, submitAnswer, question, showResultAfterQuestion, nextQuestion]);

  const handleEnter = useCallback(() => {
    const isMultiple = question.type === "multiple_choice";
    const currentAnswer = isMultiple ? selectedOptionIds : (selectedOptionId ? [selectedOptionId] : []);
    const hasSelection = currentAnswer.length > 0;

    if (!hasSelection || isInputLocked) return;
    if (!showFeedback && autoNext && !isMultiple) return; // Already handled on click

    if (!showFeedback) {
      setIsInputLocked(true);
      submitAnswer(question.id, currentAnswer);
      const isCorrectNow = isQuestionCorrect(question, currentAnswer);

      if (isCorrectNow) {
        if (autoNext) {
          if (showResultAfterQuestion) {
            setShowFeedback(true);
            setTimeout(() => {
              nextQuestion();
            }, 1000); // 1s delay to show feedback highlighting
          } else {
            nextQuestion();
          }
        } else {
          if (showResultAfterQuestion) {
            setShowFeedback(true);
            setIsInputLocked(false); // Allow manual next
          } else {
            nextQuestion();
          }
        }
      } else {
        // Incorrect answer: always pause and display explanation/manual next
        setShowFeedback(true);
        setIsInputLocked(false); // Allow manual next
      }
    } else {
      setIsInputLocked(true);
      nextQuestion();
    }
  }, [selectedOptionId, selectedOptionIds, autoNext, showFeedback, submitAnswer, question, showResultAfterQuestion, nextQuestion, isInputLocked]);

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
  }, [handleEnter, showFeedback, question, handleSelectOption, selectedOptionId, selectedOptionIds, isPaused, isInputLocked, showExitConfirm, showSubmitConfirm]);

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

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-20 md:pt-10 md:pb-32 flex justify-center">
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

              {question.display_block && question.display_block.type === 'code' && (
                <CodeBlock content={question.display_block.content} />
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

                  if (showFeedback) {
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

              {showFeedback && !isCorrect && question.explanation && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-sm leading-relaxed flex gap-3"
                >
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Giải thích</div>
                    <div className="whitespace-pre-wrap">{question.explanation}</div>
                  </div>
                </motion.div>
              )}

              {(!autoNext || (question.type === "multiple_choice" && !showFeedback) || (showFeedback && !isCorrect)) && (
                <div className="mt-6 md:mt-8 pb-8 md:pb-12 flex justify-end">
                  <button
                    onClick={handleEnter}
                    disabled={(!showFeedback && (question.type === "multiple_choice" ? selectedOptionIds.length === 0 : !selectedOptionId)) || isInputLocked}
                    className="bg-slate-900 dark:bg-indigo-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-medium transition-all hover:bg-slate-800 dark:hover:bg-indigo-750 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center gap-2 text-sm md:text-base cursor-pointer"
                  >
                    {showFeedback ? "Câu tiếp theo" : (question.type === "multiple_choice" ? "Xác nhận đáp án" : "Xác nhận")}
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
});

export default MainQuiz;
