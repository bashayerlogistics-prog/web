import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function PasswordInput({
  value,
  onChange,
  placeholder,
  required = false,
  minLength,
  id,
  className = '',
  showStrength = false,
  lang = 'en',
  autoComplete = 'current-password',
}) {
  const [visible, setVisible] = useState(false);

  const strength = showStrength ? getPasswordStrength(value) : null;

  return (
    <div className={className}>
      <div className="relative group">
        <Lock className="auth-input-icon" />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          className="auth-input auth-input-with-toggle"
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 -translate-y-1/2 end-3 p-1.5 rounded-lg text-gray-400 hover:text-brand hover:bg-brand/5 transition-all"
          tabIndex={-1}
          aria-label={visible
            ? (lang === 'ar' ? 'إخفاء كلمة المرور' : 'Hide password')
            : (lang === 'ar' ? 'إظهار كلمة المرور' : 'Show password')}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {showStrength && value && (
        <div className="mt-2 space-y-1.5">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  i <= strength.level
                    ? strength.level <= 1 ? 'bg-red-400' : strength.level <= 2 ? 'bg-amber-400' : strength.level <= 3 ? 'bg-yellow-400' : 'bg-emerald-500'
                    : 'bg-gray-200 dark:bg-dark-600'
                }`}
              />
            ))}
          </div>
          <p className={`text-xs font-medium ${strength.color}`}>{strength.label[lang] || strength.label.en}</p>
        </div>
      )}
    </div>
  );
}

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const level = Math.min(4, Math.max(1, Math.ceil(score * 0.8)));
  const labels = {
    1: { en: 'Weak — add uppercase, numbers & symbols', ar: 'ضعيفة — أضف أحرفاً كبيرة وأرقاماً ورموزاً' },
    2: { en: 'Fair — make it stronger', ar: 'متوسطة — يمكنك جعلها أقوى' },
    3: { en: 'Good password', ar: 'كلمة مرور جيدة' },
    4: { en: 'Strong & secure', ar: 'قوية وآمنة' },
  };
  const colors = { 1: 'text-red-500', 2: 'text-amber-500', 3: 'text-yellow-600', 4: 'text-emerald-600' };

  return { level, label: labels[level], color: colors[level] };
}
