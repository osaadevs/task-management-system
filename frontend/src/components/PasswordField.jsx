import { useRef, useState } from 'react';
import { EyeIcon, EyeOffIcon } from './Icons';

export default function PasswordField({
  label,
  value,
  onChange,
  placeholder = '',
  autoComplete,
  name,
  required = false,
  disabled = false,
  error = '',
  id,
  preventAutofill = false,
}) {
  const inputRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [readOnly, setReadOnly] = useState(preventAutofill);
  const fieldId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : 'password-field');

  const useMaskedText = preventAutofill && !visible;
  const inputType = useMaskedText || visible ? 'text' : 'password';

  const unlockField = () => {
    if (!preventAutofill || !readOnly) return;
    setReadOnly(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <label className="field password-field" htmlFor={fieldId}>
      {typeof label === 'string' ? <span>{label}</span> : label}
      <div className={`field__input-wrap${error ? ' field__input-wrap--error' : ''}`}>
        <input
          ref={inputRef}
          id={fieldId}
          name={preventAutofill ? undefined : name}
          type={inputType}
          className={`input-field${useMaskedText ? ' input-field--masked' : ''}`}
          value={value}
          onChange={onChange}
          onMouseDown={(event) => {
            if (preventAutofill && readOnly) {
              event.preventDefault();
              unlockField();
            }
          }}
          onFocus={unlockField}
          placeholder={placeholder}
          autoComplete={preventAutofill ? 'off' : autoComplete}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          readOnly={readOnly}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          data-1p-ignore={preventAutofill ? 'true' : undefined}
          data-lpignore={preventAutofill ? 'true' : undefined}
          data-bwignore={preventAutofill ? 'true' : undefined}
        />
        <button
          type="button"
          className="field__icon field__icon-btn password-field__toggle"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
        </button>
      </div>
      {error && (
        <span className="field-error" id={`${fieldId}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}
