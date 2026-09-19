import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X, Zap, Globe } from 'lucide-react';
import { GeocodingSearchResult } from '../../services/geocoding/types';
import { searchLocations } from '../../services/geocoding/geocodingService';
import { useI18n } from '../../i18n/I18nContext';

interface LocationSearchInputProps {
  value?: string;
  placeholder?: string;
  onSelect: (result: GeocodingSearchResult) => void;
  onClear?: () => void;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  id?: string;
}

export const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  value = '',
  placeholder,
  onSelect,
  onClear,
  className = '',
  autoFocus = false,
  disabled = false,
  id = 'location-search-input',
}) => {
  const { lang } = useI18n();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<GeocodingSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(text);
    setHighlightedIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (text.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const found = await searchLocations(text, {
          limit: 6,
          language: lang === 'es' ? 'es,en;q=0.9' : 'en,es;q=0.9',
        });
        setResults(found);
        setIsOpen(found.length > 0);
      } catch (err) {
        console.warn('Location search error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'ArrowDown' && results.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          selectItem(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const selectItem = (item: GeocodingSearchResult) => {
    setQuery('');
    setIsOpen(false);
    setResults([]);
    setHighlightedIndex(-1);
    onSelect(item);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
    if (onClear) onClear();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          id={id}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          aria-activedescendant={
            highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined
          }
          autoComplete="off"
          disabled={disabled}
          autoFocus={autoFocus}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0 && query.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          placeholder={
            placeholder ||
            (lang === 'es' ? 'Buscar ciudad, pueblo o destino...' : 'Search city, town or destination...')
          }
          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-9 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 w-4 h-4 text-emerald-400 animate-spin pointer-events-none" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title={lang === 'es' ? 'Limpiar búsqueda' : 'Clear search'}
            aria-label="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto py-1 divide-y divide-slate-800/40 animate-fade-in"
        >
          {results.map((item, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <li
                key={item.id || `${item.name}-${idx}`}
                id={`${id}-option-${idx}`}
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => selectItem(item)}
                className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-3 text-xs transition-colors ${
                  isHighlighted ? 'bg-slate-800/90 text-white' : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                      item.provider === 'local'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-100 truncate flex items-center gap-1.5">
                      <span>{item.name}</span>
                      {item.countryCode && (
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({item.countryCode})
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {item.country || item.displayName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] text-slate-400 font-mono hidden sm:inline">
                    {item.latitude.toFixed(2)}, {item.longitude.toFixed(2)}
                  </span>
                  {item.provider === 'local' ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                      <Zap className="w-2.5 h-2.5" />
                      0ms
                    </span>
                  ) : item.provider === 'nominatim' ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-950/60 text-blue-400 border border-blue-800/40">
                      <Globe className="w-2.5 h-2.5" />
                      OSM
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-950/60 text-purple-400 border border-purple-800/40">
                      {item.provider}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
