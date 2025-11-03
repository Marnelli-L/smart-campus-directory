import React, { useState, useCallback, useRef } from 'react';
import { KeyboardContext } from './KeyboardContextUtils';

export const KeyboardProvider = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeInput, setActiveInput] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [inputType, setInputType] = useState('text'); // 'text', 'password', 'email', 'number'
  const inputRef = useRef(null);

  const showKeyboard = useCallback((input, type = 'text') => {
    setActiveInput(input);
    setInputType(type);
    setInputValue(input.value || '');
    setIsVisible(true);
    inputRef.current = input;
  }, []);

  const hideKeyboard = useCallback(() => {
    setIsVisible(false);
    setActiveInput(null);
    inputRef.current = null;
  }, []);

  const updateValue = useCallback((value) => {
    setInputValue(value);
    if (activeInput) {
      // Update the actual input element
      activeInput.value = value;
      // Trigger change event
      const event = new Event('input', { bubbles: true });
      activeInput.dispatchEvent(event);
    }
  }, [activeInput]);

  const handleBackspace = useCallback(() => {
    const newValue = inputValue.slice(0, -1);
    updateValue(newValue);
  }, [inputValue, updateValue]);

  const handleClear = useCallback(() => {
    updateValue('');
  }, [updateValue]);

  const handleEnter = useCallback(() => {
    if (activeInput) {
      // Trigger enter key event
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      });
      activeInput.dispatchEvent(event);
    }
    hideKeyboard();
  }, [activeInput, hideKeyboard]);

  const value = {
    isVisible,
    activeInput,
    inputValue,
    inputType,
    showKeyboard,
    hideKeyboard,
    updateValue,
    handleBackspace,
    handleClear,
    handleEnter
  };

  return (
    <KeyboardContext.Provider value={value}>
      {children}
    </KeyboardContext.Provider>
  );
};
