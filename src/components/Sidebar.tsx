"use client";

import { useRef, useState, useEffect } from "react";
import { useQuizStore } from "@/store/quizStore";
import { parseFile } from "@/lib/parser";
import SourceAllocation from "./SourceAllocation";
import { Plus, Trash2, FileText, FileWarning, Sun, Moon, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const store = useQuizStore();

  // Local state for settings, initialized from the store on mount
  const [localShowResult, setLocalShowResult] = useState(store.showResultAfterQuestion);
  const [localAutoNext, setLocalAutoNext] = useState(store.autoNext);
  const [localCountMode, setLocalCountMode] = useState(store.questionCountMode);
  const [localCustomCount, setLocalCustomCount] = useState(store.customQuestionCount);
  const [localAllocations, setLocalAllocations] = useState(store.sourceAllocations);
  const [localSources, setLocalSources] = useState(store.sources);
  const [isSaved, setIsSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const totalAvailable = localSources.filter(s => s.active && s.isValid).reduce((acc, curr) => acc + curr.questionsCount, 0);

  // Auto-clamp custom question count if totalAvailable changes
  useEffect(() => {
    if (localCustomCount > totalAvailable && totalAvailable > 0) {
      setLocalCustomCount(totalAvailable);
    }
  }, [totalAvailable, localCustomCount]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newSources = [...localSources];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await parseFile(file);
      
      newSources.push({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        questionsCount: result.questions.length,
        active: result.isValid,
        questions: result.questions,
        isValid: result.isValid,
        error: result.error
      });
    }
    setLocalSources(newSources);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleLocalSource = (id: string) => {
    setLocalSources(prev => 
      prev.map(s => s.id === id ? { ...s, active: !s.active } : s)
    );
  };

  const removeLocalSource = (id: string) => {
    setLocalSources(prev => prev.filter(s => s.id !== id));
  };

  const handleSave = () => {
    useQuizStore.setState({
      showResultAfterQuestion: localShowResult,
      autoNext: localAutoNext,
      questionCountMode: localCountMode,
      customQuestionCount: localCustomCount,
      sourceAllocations: localAllocations,
      sources: localSources
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed Modal Header */}
      <div className="p-5 md:p-6 border-b border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-900 z-20">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cài đặt</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => store.setTheme(store.theme === 'dark' ? 'light' : 'dark')} 
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            >
              {store.theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => store.setSettingsOpen(false)} 
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto flex flex-col relative">
        
        {/* Settings Section */}
        <div className="p-5 md:p-6 space-y-5 bg-white dark:bg-slate-900 shrink-0">
          <label className="flex items-start space-x-3 cursor-pointer group">
            <div className="relative flex items-center mt-1">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={localShowResult}
                onChange={(e) => setLocalShowResult(e.target.checked)}
              />
              <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded transition-colors peer-checked:bg-indigo-600 peer-checked:border-indigo-600 dark:peer-checked:bg-indigo-500 dark:peer-checked:border-indigo-500 group-hover:border-indigo-500 flex items-center justify-center">
                {localShowResult && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-snug">Hiển thị kết quả sau mỗi câu</span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer group">
            <div className="relative flex items-center mt-1">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={localAutoNext}
                onChange={(e) => setLocalAutoNext(e.target.checked)}
              />
              <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded transition-colors peer-checked:bg-indigo-600 peer-checked:border-indigo-600 dark:peer-checked:bg-indigo-500 dark:peer-checked:border-indigo-500 group-hover:border-indigo-500 flex items-center justify-center">
                {localAutoNext && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-snug">Chuyển sang câu tiếp theo lập tức sau khi chọn</span>
          </label>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">Số lượng câu hỏi</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="questionCountMode"
                  value="ALL"
                  checked={localCountMode === 'ALL'}
                  onChange={() => setLocalCountMode('ALL')}
                  className="w-4 h-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-slate-300 dark:border-slate-600"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tất cả ({totalAvailable})</span>
              </label>

              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-3 cursor-pointer shrink-0">
                  <input
                    type="radio"
                    name="questionCountMode"
                    value="CUSTOM"
                    checked={localCountMode === 'CUSTOM'}
                    onChange={() => setLocalCountMode('CUSTOM')}
                    className="w-4 h-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-slate-300 dark:border-slate-600"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tùy chỉnh:</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={totalAvailable || 1}
                  disabled={localCountMode !== 'CUSTOM'}
                  value={localCustomCount === 0 ? '' : localCustomCount}
                  onChange={(e) => {
                    const valStr = e.target.value;
                    if (valStr === '') {
                      setLocalCustomCount(0);
                      return;
                    }
                    let val = parseInt(valStr);
                    if (isNaN(val)) val = 0;
                    val = Math.max(0, Math.min(val, totalAvailable));
                    setLocalCustomCount(val);
                  }}
                  onBlur={() => {
                    if (localCustomCount < 1) {
                      setLocalCustomCount(Math.min(1, totalAvailable));
                    }
                  }}
                  className="w-20 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-900/50"
                />
              </div>

              {localCountMode === 'CUSTOM' && localSources.filter(s => s.active && s.isValid).length > 0 && (
                <SourceAllocation
                  sources={localSources}
                  totalQuestions={localCustomCount}
                  allocations={localAllocations}
                  onChange={setLocalAllocations}
                />
              )}
            </div>
          </div>
        </div>

        {/* Data Sources Section */}
        <div className="flex-1 flex flex-col relative bg-slate-50/50 dark:bg-slate-900/50">
          
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 px-5 md:px-6 py-4 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm border-y border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm">
            <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100">Nguồn dữ liệu</h2>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-200 dark:hover:bg-indigo-900/80 transition-colors disabled:opacity-50 shadow-sm"
              title="Tải lên tệp .docx, .txt"
            >
              <Plus className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.docx"
              multiple
              className="hidden"
            />
          </div>

          <div className="p-5 md:p-6 flex-1">

        {localSources.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm">Chưa có tệp nào được tải lên.</p>
            <p className="text-xs mt-1">Hỗ trợ .docx, .txt</p>
          </div>
        ) : (
          <div className="space-y-3">
            {localSources.map((source) => (
              <div
                key={source.id}
                className={cn(
                  "p-4 rounded-xl border flex gap-3 transition-shadow shadow-sm hover:shadow-md",
                  source.isValid 
                    ? "bg-white dark:bg-slate-800 border-green-100 dark:border-green-900/50" 
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50"
                )}
              >
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={source.active}
                    disabled={!source.isValid}
                    onChange={() => toggleLocalSource(source.id)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 disabled:opacity-50"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-sm truncate text-slate-800 dark:text-slate-200" title={source.name}>
                      {source.name}
                    </h3>
                    <button
                      onClick={() => removeLocalSource(source.id)}
                      className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {source.isValid ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {source.questionsCount} câu hỏi
                    </p>
                  ) : (
                    <div className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-start gap-1">
                      <FileWarning className="w-4 h-4 shrink-0" />
                      <span>{source.error}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Fixed Footer with Cancel and Save Buttons */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0 flex gap-3 z-20">
        <button
          onClick={() => store.setSettingsOpen(false)}
          className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all active:scale-[0.98] text-sm"
        >
          Hủy
        </button>
        <button
          onClick={handleSave}
          className={cn(
            "flex-1 py-3 px-4 rounded-xl font-bold text-white transition-all shadow-md active:scale-[0.98] text-sm",
            isSaved 
              ? "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600" 
              : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          )}
        >
          {isSaved ? "Đã lưu!" : "Save"}
        </button>
      </div>
    </div>
  );
}
