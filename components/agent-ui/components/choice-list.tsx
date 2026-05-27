'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Option {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

interface ChoiceListProps {
  options: Option[];
  selected?: string;
  multiSelect?: boolean;
  onSelect?: (value: string | string[]) => void;
}

export function ChoiceList({ options, selected, multiSelect = false, onSelect }: ChoiceListProps) {
  const [selectedValues, setSelectedValues] = useState<string[]>(
    selected ? [selected] : []
  );

  const handleSelect = (value: string) => {
    let newSelected: string[];
    
    if (multiSelect) {
      newSelected = selectedValues.includes(value)
        ? selectedValues.filter(v => v !== value)
        : [...selectedValues, value];
    } else {
      newSelected = [value];
    }
    
    setSelectedValues(newSelected);
    onSelect?.(multiSelect ? newSelected : newSelected[0]);
  };

  return (
    <div className="space-y-2">
      {options.map((option) => {
        const isSelected = selectedValues.includes(option.value);
        
        return (
          <button
            key={option.value}
            onClick={() => !option.disabled && handleSelect(option.value)}
            disabled={option.disabled}
            className={cn(
              'w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
              isSelected 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50 hover:bg-muted/50',
              option.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {/* Checkbox/Radio indicator */}
            <div className={cn(
              'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5',
              isSelected 
                ? 'border-primary bg-primary' 
                : 'border-muted-foreground'
            )}>
              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-medium">{option.label}</p>
              {option.description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {option.description}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
