"use client";

import { useState, memo } from "react";
import { useQuizStore } from "@/store/quizStore";
import { CheckCircle2, XCircle, RotateCcw, Target, AlertTriangle, PlayCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { isQuestionCorrect, Question, Option } from "@/lib/parser";
import { DisplayBlockRenderer } from "@/components/DisplayBlockRenderer";

const renderOptionsText = (q: Question, opts: Option[]) => {
  if (opts.length === 0) return "Chưa trả lời";
  return opts.map(o => {
    const idx = q.options.findIndex((x: Option) => x.id === o.id);
    const letter = idx !== -1 ? String.fromCharCode(65 + idx) : "";
    return letter ? `${letter}. ${o.text}` : o.text;
  }).join("; ");
};

const ResultScreen = memo(function ResultScreen() {
  const questions = useQuizStore(state => state.questions);
  const answers = useQuizStore(state => state.answers);
  const totalTime = useQuizStore(state => state.totalTime);
  const retryQuiz = useQuizStore(state => state.retryQuiz);
  const resetApp = useQuizStore(state => state.resetApp);
  const questionTimes = useQuizStore(state => state.questionTimes);
  const retryIncorrectQuestions = useQuizStore(state => state.retryIncorrectQuestions);
  const [isRetryModalOpen, setIsRetryModalOpen] = useState(false);
  const [addExtra, setAddExtra] = useState(false);
  const [extraCount, setExtraCount] = useState<number>(10);
  const [extraMode, setExtraMode] = useState<'TIME' | 'RANDOM'>('TIME');
  const [activeTooltip, setActiveTooltip] = useState<{
    questionId: string;
    rect: { top: number; left: number; width: number; height: number };
  } | null>(null);

  const selectedTooltipId = activeTooltip?.questionId || null;

  const total = questions.length;
  let correctCount = 0;
  const incorrectQuestions: typeof questions = [];

  for (const q of questions) {
    if (isQuestionCorrect(q, answers[q.id])) {
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

  const questionsBySource: Record<string, typeof questions> = {};
  for (const q of questions) {
    const sId = q.sourceId || 'unknown';
    if (!questionsBySource[sId]) questionsBySource[sId] = [];
    questionsBySource[sId].push(q);
  }

  return (
    <div 
      className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 md:p-8 lg:p-12 transition-colors duration-300"
      onClick={() => setActiveTooltip(null)}
      onScroll={() => {
        if (activeTooltip) setActiveTooltip(null);
      }}
    >
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
              Làm lại toàn bộ bài
            </button>
            <button
              onClick={() => setIsRetryModalOpen(true)}
              disabled={incorrectQuestions.length === 0}
              className={cn(
                "flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold transition-all text-sm md:text-base cursor-pointer",
                "bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white shadow-md hover:shadow-lg active:scale-95 active:bg-rose-700 dark:active:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50",
                "disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-650 disabled:shadow-none disabled:cursor-not-allowed disabled:scale-100 disabled:ring-0 disabled:border-transparent"
              )}
            >
              <PlayCircle className="w-5 h-5" />
              Làm lại các câu sai
            </button>
            <button
              onClick={resetApp}
              className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 text-sm md:text-base"
            >
              Quay lại trang chủ
            </button>
          </div>
        </motion.div>

        {Object.entries(questionsBySource).map(([sourceId, sourceQuestions], sIdx) => {
          const sourceName = sourceQuestions[0]?.sourceName || 'Tệp không tên';
          
          const sortedQuestions = [...sourceQuestions].sort((a, b) => {
            const timeA = questionTimes[a.id] || 0;
            const timeB = questionTimes[b.id] || 0;
            return timeA - timeB;
          });

          // Compute max time for scaling. Minimum 1s to prevent 0 height
          let maxTime = Math.max(...sortedQuestions.map(q => questionTimes[q.id] || 0));
          if (maxTime < 1000) maxTime = 1000;

          // Compute summary stats
          const sourceTotalQuestions = sourceQuestions.length;
          let sourceCorrectCount = 0;
          let sourceTotalTimeMs = 0;

          sourceQuestions.forEach(q => {
            if (isQuestionCorrect(q, answers[q.id])) {
              sourceCorrectCount++;
            }
            sourceTotalTimeMs += (questionTimes[q.id] || 0);
          });

          const sourceAccuracy = sourceTotalQuestions > 0 ? Math.round((sourceCorrectCount / sourceTotalQuestions) * 100) : 0;
          
          return (
            <motion.div 
              key={sourceId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + sIdx * 0.1 }}
              className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300"
            >
              <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Thống kê thời gian: {sourceName}</h2>
              
              <div className="flex mt-8 h-48 md:h-64">
                {/* Y-axis Labels */}
                <div className="flex flex-col justify-between items-end pr-2 md:pr-3 pb-1 text-[10px] md:text-xs font-medium text-slate-400 w-10 md:w-12 shrink-0 pt-2">
                  <span>{formatTime(Math.floor(maxTime / 1000))}</span>
                  <span>{formatTime(Math.floor((maxTime / 2) / 1000))}</span>
                  <span>0:00</span>
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex-1 flex flex-col h-full">
                    {/* Chart Area */}
                    <div 
                      className={cn(
                        "flex-1 flex items-end border-b border-l border-slate-200 dark:border-slate-700 pt-2 relative",
                        sourceTotalQuestions > 30 
                          ? "gap-0.5" 
                          : sourceTotalQuestions > 15 
                            ? "gap-1" 
                            : "gap-1.5 md:gap-2"
                      )}
                    >
                      {sortedQuestions.map((q) => {
                        const timeMs = questionTimes[q.id] || 0;
                        const heightPercent = Math.max((timeMs / maxTime) * 100, 2);
                        const isCorrect = isQuestionCorrect(q, answers[q.id]);
                        const isSelected = selectedTooltipId === q.id;
                        const isAnySelected = selectedTooltipId !== null;

                        return (
                          <div 
                            key={q.id} 
                            className="relative flex-1 flex flex-col justify-end h-full cursor-pointer group"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isSelected) {
                                setActiveTooltip(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveTooltip({
                                  questionId: q.id,
                                  rect: {
                                    top: rect.top,
                                    left: rect.left,
                                    width: rect.width,
                                    height: rect.height,
                                  }
                                });
                              }
                            }}
                          >
                            <div className="w-full flex-1 flex items-end relative">
                              <div 
                                className={cn(
                                  "w-full rounded-t-[2px] md:rounded-t-[3px] transition-all duration-300",
                                  isCorrect 
                                    ? "bg-green-500/80 hover:bg-green-400 dark:bg-green-600/80 dark:hover:bg-green-505" 
                                    : "bg-red-500/80 hover:bg-red-400 dark:bg-red-600/80 dark:hover:bg-red-505",
                                  isAnySelected && !isSelected && "opacity-35 scale-95",
                                  isSelected && "ring-2 ring-indigo-500 dark:ring-indigo-400 scale-105 z-10 brightness-110 shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                                )}
                                style={{ height: `${heightPercent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    
                  </div>
                </div>
              </div>

              <div className="text-center mt-2 md:mt-4 text-[9px] md:text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                Các câu hỏi (sắp xếp theo thời gian tăng dần)
              </div>

              {/* Statistics Summary */}
              <div className="grid grid-cols-3 gap-2 md:gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/50">
                <div className="text-center">
                  <div className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Thời gian</div>
                  <div className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100">{formatTime(Math.floor(sourceTotalTimeMs / 1000))}</div>
                </div>
                <div className="text-center border-l border-r border-slate-100 dark:border-slate-700/50">
                  <div className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Số câu đúng</div>
                  <div className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100">
                    <span className="text-green-500 dark:text-green-400">{sourceCorrectCount}</span>
                    <span className="text-slate-400 dark:text-slate-500">/{sourceTotalQuestions}</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Tỷ lệ đúng</div>
                  <div className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100">{sourceAccuracy}%</div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {incorrectQuestions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4 md:space-y-6"
          >
            <div className="flex items-center justify-between mb-4 md:mb-6 px-2">
              <div className="flex items-center gap-2 md:gap-3">
                <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
                <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100">Các câu trả lời sai cần xem lại</h2>
              </div>
            </div>

            <div className="space-y-4">
              {incorrectQuestions.map((q, idx) => {
                 const selectedOptionIds = answers[q.id] || [];
                 const selectedOptions = q.options.filter(o => selectedOptionIds.includes(o.id));
                 const correctOptionIds = q.correctOptionIds;
                 const correctOptions = q.options.filter(o => correctOptionIds.includes(o.id));

                return (
                  <div key={q.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
                    <div className="font-medium text-slate-900 dark:text-slate-100 mb-4 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                      <span className="text-slate-400 dark:text-slate-500 mr-2">#{idx + 1}</span>
                      {q.text}
                    </div>

                    {q.display_block && (
                      <DisplayBlockRenderer block={q.display_block} />
                    )}
                    
                    <div className="space-y-3">
                      {selectedOptions.length > 0 ? (
                        <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/50">
                          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-red-500 mb-1">Bạn chọn</div>
                            <div className="space-y-1">
                              {selectedOptions.map(opt => {
                                const optIdx = q.options.findIndex(o => o.id === opt.id);
                                const letter = optIdx !== -1 ? String.fromCharCode(65 + optIdx) : '';
                                return (
                                  <div key={opt.id} className="text-sm md:text-base flex items-start gap-1">
                                    {letter && <span className="font-semibold">{letter}.</span>} <span>{opt.text}</span>
                                  </div>
                                );
                              })}
                            </div>
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
                      
                      {correctOptions.length > 0 && (
                        <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-xl border border-green-100 dark:border-green-900/50">
                          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-500 mb-1">Đáp án đúng</div>
                            <div className="space-y-1">
                              {correctOptions.map(opt => {
                                const optIdx = q.options.findIndex(o => o.id === opt.id);
                                const letter = optIdx !== -1 ? String.fromCharCode(65 + optIdx) : '';
                                return (
                                  <div key={opt.id} className="text-sm md:text-base flex items-start gap-1">
                                    {letter && <span className="font-semibold">{letter}.</span>} <span>{opt.text}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {q.explanation && (
                      <div className="mt-4 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-sm leading-relaxed flex gap-3">
                        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                        <div>
                          <div className="font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Giải thích</div>
                          <div className="whitespace-pre-wrap">{q.explanation}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

      </div>

      {/* Retry Incorrect Modal */}
      <AnimatePresence>
        {isRetryModalOpen && (
          <motion.div 
            key="retry-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-slate-900/60 flex items-center justify-center p-4 md:p-8"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col relative"
            >
              <div className="p-5 md:p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100">Làm lại câu sai</h2>
                <button 
                  onClick={() => setIsRetryModalOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 md:p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/50 flex items-center justify-between">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Tổng số câu trả lời sai:</span>
                  <span className="text-xl font-bold text-red-600 dark:text-red-400">{incorrectQuestions.length}</span>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={addExtra}
                      onChange={(e) => setAddExtra(e.target.checked)}
                      className="w-5 h-5 rounded text-indigo-600 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Bổ sung thêm câu hỏi</span>
                  </label>

                  <AnimatePresence>
                    {addExtra && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="pl-8 space-y-4 overflow-hidden"
                      >
                        <div>
                          <label className="block text-sm text-slate-500 dark:text-slate-400 mb-2">Số lượng câu hỏi bổ sung:</label>
                          <input 
                            type="number" 
                            min="1"
                            value={extraCount}
                            onChange={(e) => setExtraCount(parseInt(e.target.value) || 1)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 transition-colors"
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input 
                              type="radio" 
                              name="extraMode"
                              checked={extraMode === 'TIME'}
                              onChange={() => setExtraMode('TIME')}
                              className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">Bổ sung những câu hỏi tốn nhiều thời gian</span>
                          </label>
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input 
                              type="radio" 
                              name="extraMode"
                              checked={extraMode === 'RANDOM'}
                              onChange={() => setExtraMode('RANDOM')}
                              className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">Bổ sung câu hỏi ngẫu nhiên</span>
                          </label>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="p-5 md:p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                <button 
                  onClick={() => setIsRetryModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={() => {
                    const incorrectIds = incorrectQuestions.map(q => q.id);
                    retryIncorrectQuestions(incorrectIds, addExtra, extraCount, extraMode);
                    setIsRetryModalOpen(false);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  <PlayCircle className="w-5 h-5" />
                  Bắt đầu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Floating Tooltip/Popover Portal */}
      <AnimatePresence>
        {activeTooltip && (() => {
          const q = questions.find(question => question.id === activeTooltip.questionId);
          if (!q) return null;
          const timeMs = questionTimes[q.id] || 0;
          const isCorrect = isQuestionCorrect(q, answers[q.id]);
          const userAnswers = answers[q.id] || [];
          const userOptions = q.options.filter(o => userAnswers.includes(o.id));
          const correctIds = q.correctOptionIds;
          const correctOptions = q.options.filter(o => correctIds.includes(o.id));

          const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
          const barCenterX = activeTooltip.rect.left + activeTooltip.rect.width / 2;
          const tooltipWidth = viewportWidth < 768 ? 260 : 325;

          // Horizonally constrain the tooltip to the viewport edges
          let left = barCenterX;
          if (barCenterX - tooltipWidth / 2 < 16) {
            left = 16 + tooltipWidth / 2;
          } else if (barCenterX + tooltipWidth / 2 > viewportWidth - 16) {
            left = viewportWidth - 16 - tooltipWidth / 2;
          }

          // Decide whether to show above or below the bar
          const showBelow = activeTooltip.rect.top < 240;
          const top = showBelow 
            ? activeTooltip.rect.top + activeTooltip.rect.height 
            : activeTooltip.rect.top;

          const arrowLeft = barCenterX - left;

          return (
            <div 
              className="fixed z-[100] pointer-events-none"
              style={{ 
                top: `${top}px`, 
                left: `${left}px`,
                transform: 'translateX(-50%)'
              }}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: showBelow ? -10 : 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: showBelow ? -10 : 10 }}
                className={cn(
                  "relative p-3 md:p-4 bg-slate-900 dark:bg-slate-800 border border-slate-700 dark:border-slate-600 text-white rounded-xl text-xs md:text-sm shadow-2xl pointer-events-auto",
                  showBelow ? "mt-2.5" : "mb-2.5 -translate-y-full"
                )}
                style={{ width: `${tooltipWidth}px` }}
              >
                <div className="mb-2 text-xs font-bold text-slate-400 flex justify-between items-center">
                  <span>Thời gian: {formatTime(Math.floor(timeMs / 1000))}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide",
                    isCorrect ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  )}>
                    {isCorrect ? "Đúng" : "Sai"}
                  </span>
                </div>
                <div className="mb-3 line-clamp-3 leading-relaxed font-medium">{q.text}</div>
                
                <div className="space-y-2 text-[10px] md:text-xs border-t border-slate-800 dark:border-slate-700/50 pt-2">
                  <div className="flex gap-2">
                    <span className={cn("shrink-0 font-bold", isCorrect ? "text-green-400" : "text-red-400")}>Bạn chọn:</span>
                    <span className="line-clamp-2">{renderOptionsText(q, userOptions)}</span>
                  </div>
                  {!isCorrect && correctOptions.length > 0 && (
                    <div className="flex gap-2">
                      <span className="shrink-0 font-bold text-green-400">Đáp án:</span>
                      <span className="line-clamp-2">{renderOptionsText(q, correctOptions)}</span>
                    </div>
                  )}
                </div>

                <div 
                  className={cn(
                    "absolute w-3 h-3 bg-slate-900 dark:bg-slate-800 rotate-45 border border-slate-700 dark:border-slate-600 pointer-events-none",
                    showBelow 
                      ? "-top-1.5 border-t border-l border-b-0 border-r-0" 
                      : "-bottom-1.5 border-b border-r border-t-0 border-l-0"
                  )}
                  style={{ 
                    left: `calc(50% + ${arrowLeft}px)`, 
                    transform: 'translateX(-50%) rotate(45deg)' 
                  }}
                />
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
});

export default ResultScreen;
