"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { SourceFile } from "@/store/quizStore";
import { cn } from "@/lib/utils";

const SOURCE_COLORS = [
  { bg: "bg-blue-500", text: "text-blue-500", bgHover: "hover:bg-blue-400" },
  { bg: "bg-orange-500", text: "text-orange-500", bgHover: "hover:bg-orange-400" },
  { bg: "bg-green-500", text: "text-green-500", bgHover: "hover:bg-green-400" },
  { bg: "bg-purple-500", text: "text-purple-500", bgHover: "hover:bg-purple-400" },
  { bg: "bg-pink-500", text: "text-pink-500", bgHover: "hover:bg-pink-400" },
  { bg: "bg-teal-500", text: "text-teal-500", bgHover: "hover:bg-teal-400" },
  { bg: "bg-yellow-500", text: "text-yellow-500", bgHover: "hover:bg-yellow-400" },
  { bg: "bg-indigo-500", text: "text-indigo-500", bgHover: "hover:bg-indigo-400" },
];

interface Props {
  sources: SourceFile[];
  totalQuestions: number;
  allocations: Record<string, number>;
  onChange: (newAllocations: Record<string, number>) => void;
}

export default function SourceAllocation({ sources, totalQuestions, allocations, onChange }: Props) {
  const activeSources = sources.filter((s) => s.active && s.isValid);
  const barRef = useRef<HTMLDivElement>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  // Initialize or rebalance allocations if invalid
  useEffect(() => {
    if (activeSources.length === 0) return;
    
    let sum = 0;
    const currentAlloc = { ...allocations };
    let needsUpdate = false;

    activeSources.forEach((s) => {
      if (currentAlloc[s.id] === undefined) {
        currentAlloc[s.id] = 0;
        needsUpdate = true;
      }
      // Ensure no source exceeds its max
      if (currentAlloc[s.id] > s.questionsCount) {
        currentAlloc[s.id] = s.questionsCount;
        needsUpdate = true;
      }
      sum += currentAlloc[s.id];
    });

    // Remove inactive sources
    Object.keys(currentAlloc).forEach((key) => {
      if (!activeSources.find((s) => s.id === key)) {
        delete currentAlloc[key];
        needsUpdate = true;
      }
    });

    sum = Object.values(currentAlloc).reduce((a, b) => a + b, 0);

    if (sum !== totalQuestions || needsUpdate) {
      // Rebalance proportionally
      let remaining = totalQuestions;
      const newAlloc: Record<string, number> = {};
      
      // Initial proportional pass
      const totalAvailable = activeSources.reduce((acc, s) => acc + s.questionsCount, 0);
      if (totalAvailable <= totalQuestions) {
        // If total requested >= total available, just max out everyone
        activeSources.forEach(s => {
          newAlloc[s.id] = s.questionsCount;
        });
      } else {
        // Distribute based on proportion of max available
        activeSources.forEach((s) => {
          const proportion = s.questionsCount / totalAvailable;
          const assigned = Math.min(Math.floor(proportion * totalQuestions), s.questionsCount);
          newAlloc[s.id] = assigned;
          remaining -= assigned;
        });

        // Distribute remainder
        let idx = 0;
        while (remaining > 0) {
          const s = activeSources[idx % activeSources.length];
          if (newAlloc[s.id] < s.questionsCount) {
            newAlloc[s.id]++;
            remaining--;
          }
          idx++;
          // Break if we loop too much (shouldn't happen with valid data)
          if (idx > activeSources.length * 10) break;
        }
      }
      
      onChange(newAlloc);
    }
  }, [totalQuestions, activeSources, allocations, onChange]);

  const handleDragStart = (idx: number) => {
    setDraggingIdx(idx);
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setDraggingIdx(null);
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (draggingIdx === null || !barRef.current) return;

      // Prevent scrolling while dragging on touch devices
      if (e.type === 'touchmove') {
        e.preventDefault();
      }

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const rect = barRef.current.getBoundingClientRect();
      // Calculate which block the mouse is over
      const blockWidth = rect.width / totalQuestions;
      const mouseX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const targetBlockIndex = Math.floor(mouseX / blockWidth); // 0 to totalQuestions - 1

      // We are dragging the divider between activeSources[draggingIdx] and activeSources[draggingIdx + 1]
      // Find the prefix sum up to draggingIdx
      let prefixSum = 0;
      for (let i = 0; i < draggingIdx; i++) {
        prefixSum += allocations[activeSources[i].id] || 0;
      }
      
      const sourceA = activeSources[draggingIdx];
      const sourceB = activeSources[draggingIdx + 1];
      const combinedAlloc = (allocations[sourceA.id] || 0) + (allocations[sourceB.id] || 0);

      // The new boundary is targetBlockIndex
      let newAllocA = targetBlockIndex - prefixSum;
      
      // Constraints
      if (newAllocA < 0) newAllocA = 0;
      if (newAllocA > combinedAlloc) newAllocA = combinedAlloc;
      if (newAllocA > sourceA.questionsCount) newAllocA = sourceA.questionsCount;
      
      let newAllocB = combinedAlloc - newAllocA;
      if (newAllocB > sourceB.questionsCount) {
        newAllocB = sourceB.questionsCount;
        newAllocA = combinedAlloc - newAllocB;
      }

      if (
        newAllocA !== allocations[sourceA.id] || 
        newAllocB !== allocations[sourceB.id]
      ) {
        onChange({
          ...allocations,
          [sourceA.id]: newAllocA,
          [sourceB.id]: newAllocB
        });
      }
    };

    if (draggingIdx !== null) {
      window.addEventListener("mousemove", handleMouseMove as EventListener);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleMouseMove as EventListener, { passive: false });
      window.addEventListener("touchend", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove as EventListener);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove as EventListener);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [draggingIdx, allocations, activeSources, totalQuestions, onChange]);

  const handleInputChange = (sourceId: string, value: string) => {
    let newVal = parseInt(value);
    if (value === "") newVal = 0;
    if (isNaN(newVal)) return;
    
    const source = activeSources.find(s => s.id === sourceId);
    if (!source) return;

    if (newVal < 0) newVal = 0;
    if (newVal > source.questionsCount) newVal = source.questionsCount;
    if (newVal > totalQuestions) newVal = totalQuestions;

    const currentVal = allocations[sourceId] || 0;
    const diff = newVal - currentVal;
    
    if (diff === 0) return;

    const newAlloc = { ...allocations };
    newAlloc[sourceId] = newVal;

    // We need to balance the difference among other sources
    let remainingToBalance = -diff; // if diff > 0, we need to subtract from others
    
    const otherSources = activeSources.filter(s => s.id !== sourceId);
    
    if (remainingToBalance > 0) { // we need to ADD to others
      let idx = 0;
      while (remainingToBalance > 0) {
        let added = false;
        for (const s of otherSources) {
          if (newAlloc[s.id] < s.questionsCount && remainingToBalance > 0) {
            newAlloc[s.id]++;
            remainingToBalance--;
            added = true;
          }
        }
        if (!added) break; // cannot add more
      }
    } else if (remainingToBalance < 0) { // we need to SUBTRACT from others
      while (remainingToBalance < 0) {
        let subtracted = false;
        for (const s of otherSources) {
          if (newAlloc[s.id] > 0 && remainingToBalance < 0) {
            newAlloc[s.id]--;
            remainingToBalance++;
            subtracted = true;
          }
        }
        if (!subtracted) break; // cannot subtract more
      }
    }

    // if remainingToBalance is still not 0, it means we couldn't balance perfectly (e.g. hit min/max limits)
    // We adjust the original newVal to fit the actual balanced amount
    if (remainingToBalance !== 0) {
       newAlloc[sourceId] += remainingToBalance; // revert the overshoot
    }

    onChange(newAlloc);
  };

  if (activeSources.length === 0) return null;

  // Build the blocks array for the bar
  const blocks: { sourceId: string; color: any; sourceIdx: number; isFirst: boolean; isLast: boolean }[] = [];
  activeSources.forEach((source, idx) => {
    const color = SOURCE_COLORS[idx % SOURCE_COLORS.length];
    const count = allocations[source.id] || 0;
    for (let i = 0; i < count; i++) {
      blocks.push({ sourceId: source.id, color, sourceIdx: idx, isFirst: i === 0, isLast: i === count - 1 });
    }
  });

  return (
    <div className="mt-6 bg-slate-100/50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4">Tỉ lệ câu hỏi</h3>
      
      {/* Allocation Bar */}
      <div 
        ref={barRef}
        className="relative h-10 md:h-12 w-full flex rounded-xl overflow-x-auto overflow-y-hidden border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 select-none shadow-inner touch-pan-y"
        style={{ cursor: draggingIdx !== null ? 'col-resize' : 'default' }}
      >
        {blocks.map((b, i) => (
          <div 
            key={i} 
            className={cn(
              "h-full transition-colors relative group",
              b.color.bg,
              b.color.bgHover
            )}
            style={{ width: `${(1 / totalQuestions) * 100}%` }}
          >
            {/* Border to distinguish individual blocks */}
            <div className="absolute inset-0 border-r border-black/10 dark:border-white/10" />
            
            {/* Label inside the segment */}
            {b.isFirst && (allocations[b.sourceId] > (totalQuestions * 0.08)) && (
              <div className="absolute inset-0 flex items-center pl-3 whitespace-nowrap z-10 pointer-events-none">
                <span className="text-white font-bold text-xs shadow-black drop-shadow-md">
                  {allocations[b.sourceId]}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Dividers for dragging */}
        {activeSources.map((source, idx) => {
          if (idx === activeSources.length - 1) return null; // no divider after last
          
          let prefixSum = 0;
          for (let i = 0; i <= idx; i++) {
            prefixSum += allocations[activeSources[i].id] || 0;
          }
          
          if (prefixSum === 0 || prefixSum === totalQuestions) return null;

          const leftPercent = (prefixSum / totalQuestions) * 100;

          return (
            <div 
              key={`div-${source.id}`}
              className="absolute top-0 bottom-0 w-8 -ml-4 cursor-col-resize flex items-center justify-center z-20 group touch-none"
              style={{ left: `${leftPercent}%` }}
              onMouseDown={() => handleDragStart(idx)}
              onTouchStart={(e) => {
                // e.preventDefault(); // Prevent default to avoid scroll on touch start, though passive: false might be needed
                handleDragStart(idx);
              }}
            >
              <div className="w-1 h-6 md:h-8 bg-white dark:bg-slate-200 rounded-full shadow-md transition-transform group-hover:scale-x-150 group-hover:bg-indigo-400 group-active:scale-x-150 group-active:bg-indigo-500" />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-medium">
        <span>0</span>
        <span>{totalQuestions} câu hỏi</span>
      </div>

      {/* Legend / Control Panel */}
      <div className="mt-6 space-y-3">
        {activeSources.map((source, idx) => {
          const color = SOURCE_COLORS[idx % SOURCE_COLORS.length];
          const alloc = allocations[source.id] || 0;
          const percentage = totalQuestions > 0 ? Math.round((alloc / totalQuestions) * 100) : 0;
          
          return (
            <div key={source.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-600">
              <div className={cn("w-4 h-4 rounded-md shrink-0 shadow-sm", color.bg)} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" title={source.customName || source.name}>
                  {source.customName || source.name}
                </div>
                <div className="text-[10px] text-slate-500">Tối đa {source.questionsCount} câu</div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-xs font-medium text-slate-400 w-10 text-right">{percentage}%</div>
                <input
                  type="number"
                  min={0}
                  max={source.questionsCount}
                  value={alloc === 0 ? "" : alloc}
                  placeholder="0"
                  onChange={(e) => handleInputChange(source.id, e.target.value)}
                  className="w-16 px-2 py-1.5 text-sm font-bold text-center border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
