import React, { useState } from 'react';

/**
 * Professional On-Screen Keyboard for Touchscreen Kiosk
 * Designed for mall directory-style interfaces
 * Clean, simple, and reliable - no unnecessary features
 */
export default function OnScreenKeyboard({ 
  value = '', 
  onChange = () => {}, 
  onEnter = () => {}, 
  onClose = () => {}, 
  className = '', 
  style = {}, 
  suggestions = [],
  placeholder = 'Type here...',
  type = 'text' // 'text', 'password', 'email'
}) {
  const [shift, setShift] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [pressed, setPressed] = useState(null);
  const [layout, setLayout] = useState('alpha'); // 'alpha' or 'numeric'

  // Keyboard layouts
  const alphaRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  const numericKeys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['0', '.', '@']
  ];

  // Special characters for email/advanced input
  const specialChars = ['@', '.', '-', '_', '.com', '.ph'];

  const theme = {
    bg: 'linear-gradient(145deg, #f8fafb 0%, #ffffff 100%)',
    keyBg: 'linear-gradient(145deg, #ffffff 0%, #f8fafb 100%)',
    keyActiveBg: 'linear-gradient(145deg, #e0f4f0 0%, #ccede7 100%)',
    keyBorder: '#e5e7eb',
    primary: '#00695C',
    primaryActive: '#004d40',
    secondary: '#0891b2',
    danger: '#dc2626',
    text: '#111827',
    textSecondary: '#6b7280',
    shadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    shadowHover: '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
    activeShadow: 'inset 0 2px 4px rgba(0,0,0,0.12)'
  };

  const getKeyStyle = (key) => ({
    padding: '12px 14px',
    minWidth: '48px',
    minHeight: '48px',
    borderRadius: '10px',
    fontSize: '17px',
    fontWeight: '600',
    border: `1px solid ${theme.keyBorder}`,
    background: pressed === key ? theme.keyActiveBg : theme.keyBg,
    boxShadow: pressed === key ? theme.activeShadow : theme.shadow,
    color: theme.text,
    cursor: 'pointer',
    touchAction: 'manipulation',
    userSelect: 'none',
    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    WebkitTapHighlightColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });

  const handleKeyPress = (key) => {
    const isUpperCase = capsLock || shift;
    const char = isUpperCase ? key.toUpperCase() : key.toLowerCase();
    onChange(value + char);
    
    // Reset shift after one keystroke (but not capslock)
    if (shift && !capsLock) {
      setShift(false);
    }
    
    // Visual feedback
    setPressed(key);
    setTimeout(() => setPressed(null), 100);
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
    setPressed('backspace');
    setTimeout(() => setPressed(null), 100);
  };

  const handleSpace = () => {
    onChange(value + ' ');
    setPressed('space');
    setTimeout(() => setPressed(null), 100);
  };

  const handleClear = () => {
    onChange('');
  };

  const handleEnterKey = () => {
    onEnter();
    setPressed('enter');
    setTimeout(() => setPressed(null), 100);
  };

  const handleSuggestionClick = (suggestion) => {
    // Handle both string suggestions and object suggestions
    const suggestionText = typeof suggestion === 'string' ? suggestion : (suggestion.label || suggestion.name || suggestion);
    onChange(suggestionText);
    if (onEnter) {
      setTimeout(() => onEnter(), 100);
    }
  };

  const toggleShift = () => {
    setShift(!shift);
    if (capsLock) setCapsLock(false);
  };

  const toggleCapsLock = () => {
    setCapsLock(!capsLock);
    setShift(false);
  };

  const displayValue = type === 'password' ? '•'.repeat(value.length) : value;

  return (
    <div
      role="dialog"
      aria-label="On-screen keyboard"
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '20px',
        background: theme.bg,
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
        touchAction: 'none',
        userSelect: 'none',
        maxWidth: '900px',
        width: '100%',
        backdropFilter: 'blur(10px)',
        ...style
      }}
    >
      {/* Add blinking cursor animation */}
      <style>
        {`
          @keyframes blink-cursor {
            0%, 49% { opacity: 1; }
            50%, 100% { opacity: 0; }
          }
          .keyboard-cursor {
            display: inline-block;
            width: 2px;
            height: 1.2em;
            background-color: ${theme.primary};
            margin-left: 2px;
            animation: blink-cursor 1s step-end infinite;
            vertical-align: text-bottom;
          }
        `}
      </style>

      {/* Display Area */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
        padding: '14px 16px',
        borderRadius: '12px',
        border: `2px solid ${theme.primary}`,
        boxShadow: '0 2px 8px rgba(0,105,92,0.08)'
      }}>
        <div style={{
          flex: 1,
          fontSize: '18px',
          fontWeight: '500',
          color: theme.text,
          minHeight: '28px',
          display: 'flex',
          alignItems: 'center',
          overflow: 'auto',
          whiteSpace: 'nowrap',
          letterSpacing: '0.01em'
        }}>
          {displayValue ? (
            <>
              {displayValue}
              <span className="keyboard-cursor"></span>
            </>
          ) : (
            <span style={{ color: theme.textSecondary, fontWeight: '400' }}>{placeholder}</span>
          )}
        </div>
        
        <button
          onClick={handleBackspace}
          style={{
            ...getKeyStyle('backspace'),
            minWidth: '56px',
            background: 'linear-gradient(145deg, #f9fafb 0%, #f3f4f6 100%)',
            padding: '10px 12px',
            fontSize: '20px'
          }}
          aria-label="Backspace"
        >
          ⌫
        </button>
        
        <button
          onClick={handleClear}
          style={{
            ...getKeyStyle('clear'),
            minWidth: '64px',
            background: 'linear-gradient(145deg, #fef3c7 0%, #fde68a 100%)',
            borderColor: '#fbbf24',
            padding: '10px 12px',
            fontSize: '14px',
            fontWeight: '700'
          }}
          aria-label="Clear all"
        >
          Clear
        </button>
        
        <button
          onClick={onClose}
          style={{
            ...getKeyStyle('close'),
            minWidth: '56px',
            background: 'linear-gradient(145deg, #ef4444 0%, #dc2626 100%)',
            borderColor: '#dc2626',
            color: '#fff',
            padding: '10px 12px',
            fontSize: '20px'
          }}
          aria-label="Close keyboard"
        >
          ✕
        </button>
      </div>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '8px', 
          marginBottom: '12px',
          maxHeight: '90px',
          overflowY: 'auto'
        }}>
          {suggestions.slice(0, 8).map((suggestion, index) => {
            const displayText = typeof suggestion === 'string' ? suggestion : (suggestion.label || suggestion.name);
            
            return (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#fff',
                  border: '1.5px solid #00695C',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#00695C',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  maxWidth: '200px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#00695C';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.color = '#00695C';
                }}
              >
                {displayText}
              </button>
            );
          })}
        </div>
      )}

      {/* Keyboard Layout Toggle */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <button
          onClick={() => setLayout('alpha')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '700',
            background: layout === 'alpha' ? `linear-gradient(145deg, ${theme.primary} 0%, ${theme.primaryActive} 100%)` : 'linear-gradient(145deg, #ffffff 0%, #f3f4f6 100%)',
            color: layout === 'alpha' ? '#fff' : theme.text,
            border: `1px solid ${layout === 'alpha' ? theme.primary : '#e5e7eb'}`,
            cursor: 'pointer'
          }}
        >
          ABC
        </button>
        <button
          onClick={() => setLayout('numeric')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '700',
            background: layout === 'numeric' ? `linear-gradient(145deg, ${theme.primary} 0%, ${theme.primaryActive} 100%)` : 'linear-gradient(145deg, #ffffff 0%, #f3f4f6 100%)',
            color: layout === 'numeric' ? '#fff' : theme.text,
            border: `1px solid ${layout === 'numeric' ? theme.primary : '#e5e7eb'}`,
            cursor: 'pointer',
            boxShadow: theme.shadow,
            transition: 'all 0.2s ease'
          }}
        >
          123
        </button>
      </div>

      {/* Keyboard Keys */}
      {layout === 'alpha' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {alphaRows.map((row, rowIndex) => (
            <div 
              key={rowIndex} 
              style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '6px',
                paddingLeft: rowIndex > 1 ? `${rowIndex * 15}px` : '0'
              }}
            >
              {row.map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  onTouchStart={() => setPressed(key)}
                  onTouchEnd={() => setPressed(null)}
                  onMouseDown={() => setPressed(key)}
                  onMouseUp={() => setPressed(null)}
                  style={getKeyStyle(key)}
                  aria-label={`Key ${key}`}
                >
                  {(capsLock || shift) ? key.toUpperCase() : key.toLowerCase()}
                </button>
              ))}
            </div>
          ))}

          {/* Bottom Row - Special Keys */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
            <button
              onClick={toggleCapsLock}
              style={{
                ...getKeyStyle('caps'),
                minWidth: '72px',
                background: capsLock ? `linear-gradient(145deg, ${theme.primary} 0%, ${theme.primaryActive} 100%)` : 'linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)',
                color: capsLock ? '#fff' : theme.text,
                borderColor: capsLock ? theme.primary : theme.keyBorder,
                fontSize: '14px',
                padding: '10px 12px'
              }}
              aria-label="Caps Lock"
              aria-pressed={capsLock}
            >
              ⇪ Caps
            </button>

            <button
              onClick={toggleShift}
              style={{
                ...getKeyStyle('shift'),
                minWidth: '72px',
                background: shift ? `linear-gradient(145deg, ${theme.primary} 0%, ${theme.primaryActive} 100%)` : 'linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)',
                color: shift ? '#fff' : theme.text,
                borderColor: shift ? theme.primary : theme.keyBorder,
                fontSize: '14px',
                padding: '10px 12px'
              }}
              aria-label="Shift"
              aria-pressed={shift}
            >
              ⇧ Shift
            </button>

            <button
              onClick={handleSpace}
              style={{
                ...getKeyStyle('space'),
                flex: 1,
                minWidth: '200px',
                fontSize: '15px',
                fontWeight: '600'
              }}
              aria-label="Space"
            >
              Space
            </button>

            {type === 'email' && specialChars.map((char) => (
              <button
                key={char}
                onClick={() => onChange(value + char)}
                style={{
                  ...getKeyStyle(char),
                  minWidth: '45px',
                  fontSize: '12px',
                  padding: '8px 6px'
                }}
                aria-label={char}
              >
                {char}
              </button>
            ))}

            <button
              onClick={handleEnterKey}
              style={{
                ...getKeyStyle('enter'),
                minWidth: '90px',
                background: `linear-gradient(145deg, ${theme.primary} 0%, ${theme.primaryActive} 100%)`,
                borderColor: theme.primary,
                color: '#fff',
                fontSize: '15px',
                fontWeight: '700',
                padding: '10px 14px'
              }}
              aria-label="Enter"
            >
              Enter ↵
            </button>
          </div>
        </div>
      ) : (
        // Numeric Layout
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {numericKeys.map((row, rowIndex) => (
              <div key={rowIndex} style={{ display: 'flex', gap: '8px' }}>
                {row.map((key) => (
                  <button
                    key={key}
                    onClick={() => onChange(value + key)}
                    style={{
                      ...getKeyStyle(key),
                      minWidth: '70px',
                      fontSize: '20px',
                      fontWeight: '600'
                    }}
                    aria-label={`Number ${key}`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
