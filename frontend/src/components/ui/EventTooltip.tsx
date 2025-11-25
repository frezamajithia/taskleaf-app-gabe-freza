'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { Clock, Tag, Calendar, MapPin } from 'lucide-react';

interface EventTooltipProps {
  children: ReactNode;
  title: string;
  time?: string;
  date?: string;
  tag?: string;
  color?: string;
  isGoogleEvent?: boolean;
  location?: string;
  disabled?: boolean;
}

export function EventTooltip({
  children,
  title,
  time,
  date,
  tag,
  color = '#14b8a6',
  isGoogleEvent = false,
  location,
  disabled = false,
}: EventTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (disabled) return;

    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const tooltipWidth = 280;
        const tooltipHeight = 150;

        // Calculate position - prefer showing to the right
        let left = rect.right + 8;
        let top = rect.top;

        // If tooltip would go off screen right, show on left
        if (left + tooltipWidth > window.innerWidth - 20) {
          left = rect.left - tooltipWidth - 8;
        }

        // If tooltip would go off screen bottom, adjust
        if (top + tooltipHeight > window.innerHeight - 20) {
          top = window.innerHeight - tooltipHeight - 20;
        }

        // If tooltip would go off screen top
        if (top < 20) {
          top = 20;
        }

        setPosition({ top, left });
        setIsVisible(true);
      }
    }, 400); // 400ms delay before showing
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-[200] pointer-events-none animate-fade-in"
          style={{
            top: position.top,
            left: position.left,
          }}
        >
          <div className="w-72 p-4 rounded-2xl shadow-2xl backdrop-blur-xl border
            bg-white/95 dark:bg-teal-950/95
            border-patina-200/50 dark:border-teal-600/40
            shadow-black/10 dark:shadow-black/40"
          >
            {/* Header with color indicator */}
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-patina-800 dark:text-teal-100 text-sm leading-tight truncate">
                  {title}
                </h4>
                {isGoogleEvent && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-blue-600 dark:text-blue-400">
                    <i className="fa-brands fa-google text-[8px]"></i>
                    Google Calendar
                  </span>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
              {date && (
                <div className="flex items-center gap-2 text-xs text-patina-600 dark:text-teal-300">
                  <Calendar className="w-3.5 h-3.5 opacity-70" />
                  <span>{formatDate(date)}</span>
                </div>
              )}

              {time && (
                <div className="flex items-center gap-2 text-xs text-patina-600 dark:text-teal-300">
                  <Clock className="w-3.5 h-3.5 opacity-70" />
                  <span>{formatTime(time)}</span>
                </div>
              )}

              {tag && (
                <div className="flex items-center gap-2 text-xs text-patina-600 dark:text-teal-300">
                  <Tag className="w-3.5 h-3.5 opacity-70" />
                  <span>{tag}</span>
                </div>
              )}

              {location && (
                <div className="flex items-center gap-2 text-xs text-patina-600 dark:text-teal-300">
                  <MapPin className="w-3.5 h-3.5 opacity-70" />
                  <span className="truncate">{location}</span>
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="mt-3 pt-2 border-t border-patina-100 dark:border-teal-700/40">
              <span className="text-[10px] text-patina-400 dark:text-teal-500">
                Double-click to {isGoogleEvent ? 'view details' : 'edit'}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default EventTooltip;
