import React, { useState } from 'react';
import { useIsMobile } from '../hooks/use-mobile'; // Import the hook

const Section = ({ title, children, defaultOpen = false, highlight = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isMobile = useIsMobile();

  // LOGIC: 
  // If on Mobile: Use the 'isOpen' state (collapsible).
  // If on Desktop: Always force it open (true).
  const showContent = !isMobile || isOpen;

  return (
    <div className={`mb-4 border rounded-lg overflow-hidden ${highlight ? 'border-blue-200 shadow-sm' : 'border-gray-200'}`}>
      
      {/* HEADER */}
      {/* On Mobile: It's a clickable Button. On Desktop: It's a static Div. */}
      {isMobile ? (
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex justify-between items-center p-4 text-left font-medium focus:outline-none ${highlight ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-700'}`}
        >
          <span>{title}</span>
          {/* Only show +/- on mobile */}
          <span>{isOpen ? '−' : '+'}</span>
        </button>
      ) : (
        <div className={`w-full p-4 text-left font-bold text-lg ${highlight ? 'bg-blue-50 text-blue-900' : 'bg-gray-50 text-gray-800'}`}>
          {title}
        </div>
      )}

      {/* CONTENT */}
      {showContent && (
        <div className="p-4 bg-white border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};

export default Section;