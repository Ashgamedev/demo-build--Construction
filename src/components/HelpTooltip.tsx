import { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  text: string;
  className?: string;
}

export function HelpTooltip({ text, className }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div 
      className={clsx("relative inline-flex items-center", className)} 
      ref={containerRef}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1 -m-1 transition-colors"
        aria-label="More information"
        aria-expanded={isOpen}
      >
        <Info className="w-4 h-4" />
      </button>

      {isOpen && (
        <div 
          className="absolute z-50 w-64 p-3 mt-2 bg-gray-900 text-white text-xs leading-relaxed rounded-lg shadow-xl -left-2 top-full md:left-1/2 md:-translate-x-1/2"
          role="tooltip"
        >
          <div className="flex justify-between items-start mb-1 md:hidden">
            <span className="font-semibold text-gray-300">Help / Info</span>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(false); }}
              className="text-gray-400 hover:text-white"
              aria-label="Close tooltip"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          {text}
          <div className="absolute -top-1 left-3 md:left-1/2 md:-translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 hidden md:block"></div>
        </div>
      )}
    </div>
  );
}
