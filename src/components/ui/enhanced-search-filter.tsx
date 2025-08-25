'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Search, X, ChevronDown, Zap, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface SearchFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  
  filters: {
    key: string;
    label: string;
    value: string;
    options: FilterOption[];
    placeholder?: string;
  }[];
  
  onFilterChange: (key: string, value: string) => void;
  onClearFilters?: () => void;
  
  className?: string;
  showActiveFilters?: boolean;
  compact?: boolean;
  theme?: 'default' | 'glass' | 'minimal';
}

export default function EnhancedSearchFilter({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  onFilterChange,
  onClearFilters,
  className,
  showActiveFilters = true,
  compact = false,
  theme = 'default'
}: SearchFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed for compact mode
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Debounced search to improve performance
  const handleSearchChangeDebounced = useCallback(
    (value: string) => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      const newTimeout = setTimeout(() => {
        onSearchChange(value);
      }, 300);
      
      setSearchTimeout(newTimeout);
    },
    [onSearchChange, searchTimeout]
  );

  const handleSearchChange = (value: string) => {
    onSearchChange(value); // Immediate UI update
    handleSearchChangeDebounced(value); // Debounced API call
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    return filters.filter(filter => filter.value && filter.value !== 'all').length;
  }, [filters]);

  const hasActiveFilters = searchValue || activeFiltersCount > 0;

  // Theme classes
  const themeClasses = {
    default: {
      container: 'bg-white border border-gray-200 shadow-sm',
      search: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20',
      select: 'border-gray-300 focus:border-blue-500',
      badge: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    glass: {
      container: 'bg-white/80 backdrop-blur-md border border-white/30 shadow-xl',
      search: 'bg-white/60 border-white/30 focus:border-white/50 focus:ring-white/20',
      select: 'bg-white/60 border-white/30 focus:border-white/50',
      badge: 'bg-white/70 text-gray-700 border-white/40'
    },
    minimal: {
      container: 'bg-gray-50 border border-gray-100 shadow-none',
      search: 'bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-200/50',
      select: 'bg-white border-gray-200 focus:border-gray-400',
      badge: 'bg-gray-100 text-gray-600 border-gray-200'
    }
  };

  const currentTheme = themeClasses[theme];

  return (
    <div className={cn(
      'rounded-xl transition-all duration-300 ease-in-out',
      compact ? 'p-2 sm:p-3' : 'p-4 sm:p-5 lg:p-6',
      currentTheme.container,
      className
    )}>
      {/* Compact Header */}
      {compact ? (
        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <div className="flex-1 relative">
            <div className={cn(
              "absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors",
              focusedInput === 'search' ? "text-blue-500" : "text-gray-400"
            )}>
              <Search className="h-4 w-4" />
            </div>
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setFocusedInput('search')}
              onBlur={() => setFocusedInput(null)}
              className={cn(
                "pl-10 pr-10 h-9 text-sm transition-all duration-200",
                "placeholder:text-gray-400",
                currentTheme.search,
                focusedInput === 'search' && "ring-1 ring-blue-300"
              )}
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSearchChange('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0 hover:bg-gray-100"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {/* Filter Toggle Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "h-9 px-3 flex items-center gap-2 text-sm transition-all duration-200",
              isExpanded ? "bg-blue-50 border-blue-200 text-blue-700" : "hover:bg-gray-50"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-blue-100 text-blue-700">
                {activeFiltersCount}
              </Badge>
            )}
            <ChevronDown 
              className={cn(
                "h-3 w-3 transition-transform duration-200",
                isExpanded ? "rotate-180" : ""
              )} 
            />
          </Button>

          {/* Clear Filters - Only show when has active filters */}
          {hasActiveFilters && onClearFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-9 px-2 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ) : (
        // Full Header for non-compact mode
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Search & Filters</h3>
              {hasActiveFilters && (
                <Badge variant="secondary" className={cn("text-xs", currentTheme.badge)}>
                  {activeFiltersCount + (searchValue ? 1 : 0)} active
                </Badge>
              )}
            </div>
            {hasActiveFilters && onClearFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Clear All</span>
                <span className="sm:hidden">Clear</span>
              </Button>
            )}
          </div>
        
          {compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              <ChevronDown 
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isExpanded ? "rotate-180" : ""
                )} 
              />
            </Button>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className={cn(
        "transition-all duration-300 ease-in-out overflow-hidden",
        compact ? (isExpanded ? "max-h-96 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0") :
        (isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0")
      )}>
        <div className="space-y-4">
          {/* Search Bar - Only for non-compact mode */}
          {!compact && (
            <div className="relative group">
              <div className={cn(
                "absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors",
                focusedInput === 'search' ? "text-blue-500" : "text-gray-400"
              )}>
                <Search className="h-4 w-4" />
              </div>
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setFocusedInput('search')}
                onBlur={() => setFocusedInput(null)}
                className={cn(
                  "pl-10 pr-10 h-10 sm:h-11 text-sm transition-all duration-200",
                  "placeholder:text-gray-400",
                  "hover:border-opacity-70",
                  currentTheme.search,
                  focusedInput === 'search' && "ring-2 scale-[1.01]"
                )}
              />
              {searchValue && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-gray-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}

          {/* Filter Selects */}
          {filters.length > 0 && (
            <div className={cn(
              "grid gap-3",
              compact ? "grid-cols-1 sm:grid-cols-2" : (
                filters.length === 1 ? "grid-cols-1" :
                filters.length === 2 ? "grid-cols-1 sm:grid-cols-2" :
                filters.length === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" :
                filters.length <= 4 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" :
                "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
              )
            )}>
              {filters.map((filter) => (
                <div key={filter.key} className={cn(
                  compact ? "space-y-1" : "space-y-1.5 sm:space-y-2"
                )}>
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block">
                    {filter.label}
                  </label>
                  <Select
                    value={filter.value || 'all'}
                    onValueChange={(value) => onFilterChange(filter.key, value === 'all' ? '' : value)}
                  >
                    <SelectTrigger className={cn(
                      compact ? "h-9" : "h-10 sm:h-11",
                      "transition-all duration-200 hover:border-opacity-70 text-sm",
                      currentTheme.select,
                      filter.value && filter.value !== 'all' && "ring-1 ring-blue-200 border-blue-300"
                    )}>
                      <SelectValue placeholder={filter.placeholder || `All ${filter.label}`} />
                    </SelectTrigger>
                  <SelectContent className="max-h-64 w-full min-w-[200px]">
                    <SelectItem value="all" className="font-medium">
                      All {filter.label}
                      {filter.options.length > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({filter.options.reduce((sum, opt) => sum + (opt.count || 0), 0)})
                        </span>
                      )}
                    </SelectItem>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="group">
                        <div className="flex items-center justify-between w-full">
                          <span>{option.label}</span>
                          {option.count !== undefined && (
                            <span className="text-xs text-gray-400 group-hover:text-gray-600">
                              {option.count}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            </div>
          )}

          {/* Active Filters Display */}
          {showActiveFilters && hasActiveFilters && !compact && (
            <div className="flex flex-wrap gap-2 pt-3 sm:pt-4 border-t border-gray-100/60">
              {searchValue && (
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs group cursor-pointer", currentTheme.badge)}
                  onClick={() => handleSearchChange('')}
                >
                  Search: &ldquo;{searchValue.length > 15 ? searchValue.substring(0, 15) + '...' : searchValue}&rdquo;
                  <X className="h-3 w-3 ml-1 group-hover:text-red-500" />
                </Badge>
              )}
              {filters.map((filter) => 
                filter.value && filter.value !== 'all' ? (
                  <Badge 
                    key={filter.key}
                    variant="secondary" 
                    className={cn("text-xs group cursor-pointer", currentTheme.badge)}
                    onClick={() => onFilterChange(filter.key, '')}
                  >
                    {filter.label}: {filter.options.find(opt => opt.value === filter.value)?.label || filter.value}
                    <X className="h-3 w-3 ml-1 group-hover:text-red-500" />
                  </Badge>
                ) : null
              )}
            </div>
          )}
        </div>
      </div>

      {/* Performance Indicator */}
      {!compact && (
        <div className="mt-4 sm:mt-5 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100/60 pt-3 sm:pt-4">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            <span className="hidden sm:inline">Real-time filtering</span>
            <span className="sm:hidden">Live</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {hasActiveFilters && (
              <span className="text-xs">
                {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''}
              </span>
            )}
            <span className="text-green-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="hidden sm:inline">Live</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
