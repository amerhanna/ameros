import * as React from "react";
import { Input, InputProps } from "./input";

interface DebouncedInputProps extends InputProps {
  debounceTime?: number;
}

const DebouncedInput = React.forwardRef<HTMLInputElement, DebouncedInputProps>(
  ({ debounceTime = 500, onChange, value: propValue, ...props }, ref) => {
    const [inputValue, setInputValue] = React.useState(propValue);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Sync internal state with propValue when it changes
    React.useEffect(() => {
      setInputValue(propValue);
    }, [propValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        onChange?.(e);
      }, debounceTime);
    };

    // Cleanup timeout on component unmount
    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return <Input ref={ref} value={inputValue} onChange={handleChange} {...props} />;
  }
);
DebouncedInput.displayName = "DebouncedInput";

export { DebouncedInput };
