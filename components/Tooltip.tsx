import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      // 如果上方空间不足 100px 且下方空间更大，则显示在下方
      setPosition(spaceAbove < 100 && spaceBelow > spaceAbove ? 'bottom' : 'top');
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  return (
    <div
      ref={containerRef}
      className={`inline-flex items-center min-w-0 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div className="relative inline-block w-full min-w-0">
        {children}
        {isVisible && (
          <div
            className="fixed z-[2000] pointer-events-none animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: containerRef.current?.getBoundingClientRect().left! + (containerRef.current?.getBoundingClientRect().width! / 2),
              top: position === 'top'
                ? containerRef.current?.getBoundingClientRect().top! - 8
                : containerRef.current?.getBoundingClientRect().bottom! + 8,
              transform: position === 'top' ? 'translate(-50%, -100%)' : 'translateX(-50%)'
            }}
          >
            <div className="bg-gray-900/95 backdrop-blur-sm shadow-2xl p-2 rounded-lg border border-gray-700 max-w-[220px] sm:max-w-xs">
              <div className="text-white text-[10px] leading-relaxed max-h-24 overflow-y-auto custom-scrollbar break-words text-center">
                {text}
              </div>
              <div
                className={`absolute left-1/2 -translate-x-1/2 border-[5px] border-transparent
                  ${position === 'top' ? 'top-full border-t-gray-900/95' : 'bottom-full border-b-gray-900/95'}
                `}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tooltip;