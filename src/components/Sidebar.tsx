"use client";

import { useRef, useState } from "react";
import { useQuizStore } from "@/store/quizStore";
import { parseFile } from "@/lib/parser";
import { Plus, Trash2, FileText, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const {
    showResultAfterQuestion,
    setShowResultAfterQuestion,
    autoNext,
    setAutoNext,
    questionCountMode,
    setQuestionCountMode,
    customQuestionCount,
    setCustomQuestionCount,
    sources,
    addSource,
    toggleSource,
    removeSource,
  } = useQuizStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const totalAvailable = sources.filter(s => s.active && s.isValid).reduce((acc, curr) => acc + curr.questionsCount, 0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await parseFile(file);
      
      addSource({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        questionsCount: result.questions.length,
        active: result.isValid,
        questions: result.questions,
        isValid: result.isValid,
        error: result.error
      });
    }
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-slate-200 shrink-0">
        <h2 className="text-xl font-bold mb-4 text-slate-800">Cài đặt</h2>
        
        <div className="space-y-4">
          <label className="flex items-start space-x-3 cursor-pointer group">
            <div className="relative flex items-center mt-1">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={showResultAfterQuestion}
                onChange={(e) => setShowResultAfterQuestion(e.target.checked)}
              />
              <div className="w-5 h-5 border-2 border-slate-300 rounded transition-colors peer-checked:bg-indigo-600 peer-checked:border-indigo-600 group-hover:border-indigo-500 flex items-center justify-center">
                {showResultAfterQuestion && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm font-medium text-slate-700 leading-snug">Hiển thị kết quả sau mỗi câu</span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer group">
            <div className="relative flex items-center mt-1">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={autoNext}
                onChange={(e) => setAutoNext(e.target.checked)}
              />
              <div className="w-5 h-5 border-2 border-slate-300 rounded transition-colors peer-checked:bg-indigo-600 peer-checked:border-indigo-600 group-hover:border-indigo-500 flex items-center justify-center">
                {autoNext && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm font-medium text-slate-700 leading-snug">Chuyển sang câu tiếp theo lập tức sau khi chọn</span>
          </label>

          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Số lượng câu hỏi</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="questionCountMode"
                  value="ALL"
                  checked={questionCountMode === 'ALL'}
                  onChange={() => setQuestionCountMode('ALL')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">Tất cả ({totalAvailable})</span>
              </label>

              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-3 cursor-pointer shrink-0">
                  <input
                    type="radio"
                    name="questionCountMode"
                    value="CUSTOM"
                    checked={questionCountMode === 'CUSTOM'}
                    onChange={() => setQuestionCountMode('CUSTOM')}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">Tùy chỉnh:</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={totalAvailable || 1}
                  disabled={questionCountMode !== 'CUSTOM'}
                  value={customQuestionCount}
                  onChange={(e) => setCustomQuestionCount(parseInt(e.target.value) || 1)}
                  className="w-20 px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">Nguồn dữ liệu</h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center hover:bg-indigo-200 transition-colors disabled:opacity-50"
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

        {sources.length === 0 ? (
          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Chưa có tệp nào được tải lên.</p>
            <p className="text-xs mt-1">Hỗ trợ .docx, .txt</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => (
              <div
                key={source.id}
                className={cn(
                  "p-4 rounded-xl border flex gap-3 transition-shadow shadow-sm hover:shadow-md",
                  source.isValid 
                    ? "bg-white border-green-100" 
                    : "bg-red-50 border-red-200"
                )}
              >
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={source.active}
                    disabled={!source.isValid}
                    onChange={() => toggleSource(source.id)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 disabled:opacity-50"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-sm truncate text-slate-800" title={source.name}>
                      {source.name}
                    </h3>
                    <button
                      onClick={() => removeSource(source.id)}
                      className="text-slate-400 hover:text-red-500 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {source.isValid ? (
                    <p className="text-xs text-slate-500 mt-1">
                      {source.questionsCount} câu hỏi
                    </p>
                  ) : (
                    <div className="text-xs text-red-600 mt-1 flex items-start gap-1">
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
  );
}
