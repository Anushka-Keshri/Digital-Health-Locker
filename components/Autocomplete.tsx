import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface AutocompleteProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  onSelect?: (value: string) => void;
  multi?: boolean; // If true, appends value with comma
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  className = '',
  onSelect,
  multi = false
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Determine the current query term for multi-select (text after last comma)
    const currentTerm = multi ? value.split(',').pop()?.trim() || '' : value;
    
    if (currentTerm.length > 0 && showSuggestions) {
      const matches = options.filter(opt => 
        opt.toLowerCase().includes(currentTerm.toLowerCase())
      );
      setFilteredOptions(matches.slice(0, 10)); // Limit to 10
    } else {
      setFilteredOptions([]);
    }
  }, [value, options, showSuggestions, multi]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelect = (option: string) => {
    let newValue = option;
    
    if (multi) {
      const parts = value.split(',');
      parts.pop(); // Remove the partial term
      parts.push(` ${option}`); // Add selected term
      // Clean up leading comma if first item
      newValue = parts.join(',').replace(/^,/, '').trim();
      // Add a trailing comma and space for next entry convenience? 
      // Actually standard is just add text. Let's add ", " for next flow.
      newValue += ', ';
    }

    onChange(newValue);
    if (onSelect) onSelect(option);
    setShowSuggestions(false);
  };

  const InputComponent = multi ? 'textarea' : 'input';

  return (
    <div className={`relative w-full ${className}`} ref={wrapperRef}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <div className="relative">
        {multi ? (
             <textarea
                className="w-full px-3 py-2 bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow min-h-[80px]"
                value={value}
                onChange={handleInputChange}
                onFocus={() => setShowSuggestions(true)}
                placeholder={placeholder}
             />
        ) : (
             <input
                type="text"
                className="w-full px-3 py-2 bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                value={value}
                onChange={handleInputChange}
                onFocus={() => setShowSuggestions(true)}
                placeholder={placeholder}
            />
        )}
        
        {/* Suggestion Dropdown */}
        {showSuggestions && filteredOptions.length > 0 && (
          <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto mt-1 left-0">
            {filteredOptions.map((option, idx) => (
              <li
                key={idx}
                className="px-4 py-2 hover:bg-primary-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-none flex justify-between items-center group"
                onClick={() => handleSelect(option)}
              >
                <span>
                   {/* Highlight match */}
                   {option}
                </span>
                <span className="opacity-0 group-hover:opacity-100 text-primary-600">
                    <ChevronDown className="h-3 w-3 -rotate-90" />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
