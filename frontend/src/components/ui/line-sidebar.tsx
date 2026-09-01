"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface LineSidebarProps {
  items: string[];
  accentColor?: string;
  textColor?: string;
  markerColor?: string;
  showIndex?: boolean;
  showMarker?: boolean;
  proximityRadius?: number;
  maxShift?: number;
  falloff?: "smooth" | "linear";
  markerLength?: number;
  markerGap?: number;
  tickScale?: number;
  scaleTick?: boolean;
  itemGap?: number;
  fontSize?: number;
  smoothing?: number;
  defaultActive?: number;
  active?: number;
  onItemClick?: (index: number, label: string) => void;
  className?: string;
  itemBadges?: Record<number, number | string>;
}

export function LineSidebar({
  items,
  accentColor = "var(--primary)",
  textColor,
  markerColor = "var(--border)",
  showIndex = false,
  showMarker = true,
  proximityRadius = 100,
  maxShift = 18,
  falloff = "smooth",
  markerLength = 32,
  markerGap = 8,
  itemGap = 16,
  fontSize = 0.9,
  defaultActive = 0,
  active: controlledActive,
  onItemClick,
  className,
  itemBadges = {},
}: Readonly<LineSidebarProps>) {
  const [internalActive, setInternalActive] = useState(defaultActive);
  const activeIndex = controlledActive ?? internalActive;

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [shifts, setShifts] = useState<number[]>(
    new Array(items.length).fill(0),
  );
  const [markerY, setMarkerY] = useState(0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const mouseY = e.clientY;

      const newShifts = items.map((_, i) => {
        const el = itemRefs.current[i];
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        const itemCenterY = rect.top + rect.height / 2;
        const dist = Math.abs(mouseY - itemCenterY);

        if (dist > proximityRadius) return 0;
        const ratio = (proximityRadius - dist) / proximityRadius;
        const curve =
          falloff === "smooth" ? Math.sin((ratio * Math.PI) / 2) : ratio;
        return curve * maxShift;
      });

      setShifts(newShifts);
    },
    [items, proximityRadius, maxShift, falloff],
  );

  const handleMouseLeave = () => {
    setShifts(new Array(items.length).fill(0));
  };

  useEffect(() => {
    const activeEl = itemRefs.current[activeIndex];
    if (activeEl && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      const topOffset =
        activeRect.top -
        containerRect.top +
        activeRect.height / 2 -
        markerLength / 2;
      setMarkerY(topOffset);
    }
  }, [activeIndex, markerLength, items]);

  const handleClick = (index: number, label: string) => {
    setInternalActive(index);
    onItemClick?.(index, label);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("relative flex flex-col select-none py-2", className)}
    >
      {showMarker && (
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-border"
          style={{ backgroundColor: markerColor }}
        />
      )}

      {showMarker && (
        <div
          className="absolute left-0 w-0.75 rounded-full transition-all duration-300 ease-out z-10 shadow-sm"
          style={{
            top: `${markerY}px`,
            height: `${markerLength}px`,
            backgroundColor: accentColor,
            boxShadow: `0 0 10px ${accentColor}80`,
          }}
        />
      )}

      <div className="flex flex-col" style={{ gap: `${itemGap}px` }}>
        {items.map((label, index) => {
          const isActive = index === activeIndex;
          const shift = shifts[index] || 0;
          const badge = itemBadges[index];

          return (
            <button
              key={label}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              onClick={() => handleClick(index, label)}
              style={{
                transform: `translateX(${shift + (showMarker ? markerGap : 0)}px)`,
                fontSize: `${fontSize}rem`,
              }}
              className={cn(
                "group flex items-center justify-between text-left px-3 py-2 rounded-xl transition-all duration-150 ease-out cursor-pointer font-medium relative",
                isActive
                  ? "bg-primary/10 text-primary font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              )}
            >
              <div className="flex items-center gap-2.5">
                {showIndex ? (
                  <span
                    className={cn(
                      "font-mono text-[10px] w-4 text-center",
                      isActive
                        ? "text-primary font-bold"
                        : "text-muted-foreground/60",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                ) : (
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all",
                      isActive
                        ? "bg-primary scale-125"
                        : "bg-muted-foreground/40 group-hover:bg-muted-foreground",
                    )}
                  />
                )}
                <span
                  style={{ color: isActive ? accentColor : textColor }}
                  className="tracking-tight"
                >
                  {label}
                </span>
              </div>

              {badge !== undefined && (
                <span
                  className={cn(
                    "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:bg-secondary",
                  )}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LineSidebar;
