import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  'data-testid'?: string;
}

export function NumericInput({ value, onChange, min, max, step, className, ...props }: NumericInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(String(value));
  const [focused, setFocused] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);

    if (raw === '' || raw === '-') return;

    let num = parseFloat(raw);
    if (isNaN(num)) return;

    if (min !== undefined && num < min) num = min;
    if (max !== undefined && num > max) num = max;

    onChange(num);
  }, [onChange, min, max]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    if (displayValue === '' || displayValue === '-' || isNaN(parseFloat(displayValue))) {
      const fallback = min !== undefined ? min : 0;
      setDisplayValue(String(fallback));
      onChange(fallback);
    } else {
      let num = parseFloat(displayValue);
      if (min !== undefined && num < min) num = min;
      if (max !== undefined && num > max) num = max;
      setDisplayValue(String(num));
      onChange(num);
    }
  }, [displayValue, onChange, min, max]);

  const handleFocus = useCallback(() => {
    setFocused(true);
    setDisplayValue(String(value));
  }, [value]);

  return (
    <Input
      type="number"
      value={focused ? displayValue : String(value)}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      min={min}
      max={max}
      step={step}
      className={className}
      data-testid={props['data-testid']}
    />
  );
}
