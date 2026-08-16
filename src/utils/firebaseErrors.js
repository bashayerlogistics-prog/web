/** Firebase auth/firestore errors → user-friendly messages + console */

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'tempmail.com',
  'temp-mail.org', 'throwaway.email', 'yopmail.com', '10minutemail.com',
  'trashmail.com', 'fakeinbox.com', 'sharklasers.com', 'getnada.com',
  'maildrop.cc', 'dispostable.com', 'tempail.com', 'emailondeck.com',
  'mintemail.com', 'mytemp.email', 'tempinbox.com', 'mailnesia.com',
]);

const WEAK_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123', 'password1',
  '111111', '123456789', 'welcome', 'admin123', 'letmein', 'monkey',
  'dragon', 'master', 'login', 'princess', 'football', 'shadow',
]);

/** Identity Toolkit REST reasons → SDK codes (auth/internal-error hides them in customData). */
const REST_REASON_CODES = {
  EMAIL_EXISTS: 'auth/email-already-in-use',
  EMAIL_NOT_FOUND: 'auth/user-not-found',
  INVALID_EMAIL: 'auth/invalid-email',
  MISSING_EMAIL: 'auth/missing-email',
  MISSING_PASSWORD: 'auth/missing-password',
  INVALID_PASSWORD: 'auth/wrong-password',
  INVALID_LOGIN_CREDENTIALS: 'auth/invalid-credential',
  WEAK_PASSWORD: 'auth/weak-password',
  PASSWORD_DOES_NOT_MEET_REQUIREMENTS: 'auth/password-does-not-meet-requirements',
  OPERATION_NOT_ALLOWED: 'auth/operation-not-allowed',
  PASSWORD_LOGIN_DISABLED: 'auth/operation-not-allowed',
  ADMIN_ONLY_OPERATION: 'auth/admin-restricted-operation',
  USER_DISABLED: 'auth/user-disabled',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'auth/too-many-requests',
  QUOTA_EXCEEDED: 'auth/quota-exceeded',
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN: 'auth/requires-recent-login',
  TOKEN_EXPIRED: 'auth/requires-recent-login',
  PERMISSION_DENIED: 'permission-denied',
};

/** Shown only when the code is unmapped — wording follows the screen the user is on. */
const GENERIC_MESSAGES = {
  ar: {
    register: 'تعذر إنشاء الحساب. تحقق من البيانات وحاول مجدداً.',
    login: 'تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور وحاول مجدداً.',
    'google-login': 'تعذر تسجيل الدخول عبر Google. حاول مجدداً.',
    'reset-password': 'تعذر إرسال رابط إعادة التعيين. حاول مجدداً.',
    auth: 'تعذر إكمال العملية. حاول مجدداً.',
  },
  en: {
    register: 'We could not create your account. Check your details and try again.',
    login: 'We could not sign you in. Check your email and password and try again.',
    'google-login': 'Google sign-in could not be completed. Please try again.',
    'reset-password': 'We could not send the reset link. Please try again.',
    auth: 'Something went wrong. Please try again.',
  },
};

const ERROR_MESSAGES = {
  ar: {
    'auth/email-already-in-use': 'هذا البريد الإلكتروني مسجل بالفعل. يمكنك تسجيل الدخول مباشرة.',
    'auth/invalid-email': 'يرجى إدخال بريد إلكتروني صحيح (example@gmail.com).',
    'auth/weak-password': 'يجب ألا تقل كلمة المرور عن 6 أحرف.',
    'auth/user-not-found': 'لم نعثر على حساب بهذا البريد. أنشئ حساباً أولاً.',
    'auth/wrong-password': 'كلمة المرور غير صحيحة.',
    'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    'auth/too-many-requests': 'تم إجراء محاولات كثيرة. يرجى المحاولة مجدداً بعد 5 دقائق.',
    'auth/popup-closed-by-user': 'تم إلغاء تسجيل الدخول عبر Google.',
    'auth/popup-blocked': 'منع المتصفح النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة.',
    'auth/unauthorized-domain': 'هذا النطاق غير مصرح به لتسجيل الدخول حالياً.',
    'auth/operation-not-allowed': 'تسجيل الدخول بالبريد وكلمة المرور غير متاح حالياً.',
    'auth/network-request-failed': 'تعذر الاتصال. تحقق من اتصالك بالإنترنت وحاول مجدداً.',
    'auth/internal-error': 'حدث خطأ غير متوقع. يرجى المحاولة مجدداً.',
    'auth/invalid-api-key': 'تعذر الاتصال بخدمة تسجيل الدخول.',
    'auth/missing-email': 'يرجى إدخال البريد الإلكتروني.',
    'auth/missing-password': 'يرجى إدخال كلمة المرور.',
    'auth/admin-restricted-operation': 'إنشاء الحسابات الجديدة موقوف حالياً. يرجى التواصل مع الدعم.',
    'auth/password-does-not-meet-requirements': 'كلمة المرور لا تحقق شروط الأمان. استخدم 8 أحرف على الأقل تتضمن حرفاً كبيراً وصغيراً ورقماً ورمزاً.',
    'auth/user-disabled': 'تم تعطيل هذا الحساب. يرجى التواصل مع الدعم.',
    'auth/cancelled-popup-request': 'تم إلغاء محاولة الدخول السابقة. حاول مرة واحدة فقط.',
    'auth/requires-recent-login': 'انتهت الجلسة. يرجى تسجيل الدخول مجدداً.',
    'auth/quota-exceeded': 'تم تجاوز الحد المسموح مؤقتاً. يرجى المحاولة لاحقاً.',
    'auth/timeout': 'استغرقت العملية وقتاً طويلاً. حاول مجدداً.',
    'permission-denied': 'تعذر حفظ بيانات الحساب. يرجى التواصل مع الدعم.',
    unauthenticated: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.',
    unavailable: 'الخدمة غير متاحة مؤقتاً. تحقق من الاتصال وحاول مجدداً.',
    'deadline-exceeded': 'استغرق الاتصال وقتاً طويلاً. حاول مجدداً.',
    'failed-precondition': 'تعذر إكمال العملية الآن. حاول مجدداً بعد قليل.',
    'resource-exhausted': 'تم تجاوز الحد المسموح مؤقتاً. حاول لاحقاً.',
    'already-exists': 'هذا السجل موجود بالفعل.',
    'not-found': 'لم يتم العثور على البيانات المطلوبة.',
    'invalid-argument': 'بيانات غير صحيحة. يرجى المراجعة والمحاولة مجدداً.',
    internal: 'حدث خطأ غير متوقع. يرجى المحاولة مجدداً.',
    'auth/unknown': 'تعذر إكمال العملية. تحقق من البيانات وحاول مجدداً.',
    'auth/disposable-email': 'لا يمكن استخدام بريد إلكتروني مؤقت. يرجى استخدام بريدك الحقيقي.',
    'auth/weak-password-common': 'كلمة المرور شائعة وسهلة التخمين. اختر كلمة أقوى.',
    'auth/password-mismatch': 'كلمتا المرور غير متطابقتين.',
    'auth/password-too-weak': 'استخدم 8 أحرف على الأقل تتضمن حرفاً كبيراً وصغيراً ورقماً ورمزاً.',
    'auth/google-only-account': 'هذا الحساب مرتبط بـ Google. استخدم خيار «المتابعة عبر Google» في صفحة الدخول.',
    'auth/admin-account': 'هذا الحساب مخصص للوحة الإدارة فقط. سجّل الدخول من /admin/login.',
    'auth/account-exists-with-different-credential': 'هذا البريد مسجل بطريقة أخرى. سجّل الدخول بالبريد وكلمة المرور، أو استخدم نفس طريقة التسجيل السابقة.',
  },
  en: {
    'auth/email-already-in-use': 'This email is already registered. Go to Login.',
    'auth/invalid-email': 'Enter a valid email (example@gmail.com).',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'Account not found. Please register first.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many attempts. Try again in 5 minutes.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/popup-blocked': 'Popup blocked. Please allow popups.',
    'auth/unauthorized-domain': 'This domain is not authorized. Add it in Firebase Console → Authentication → Settings → Authorized domains.',
    'auth/operation-not-allowed': 'Email/Password sign-up is not enabled in Firebase Console.',
    'auth/network-request-failed': 'Check your internet connection.',
    'auth/internal-error': 'Firebase internal error. Please try again.',
    'auth/invalid-api-key': 'Invalid Firebase API key. Check your .env file.',
    'auth/missing-email': 'Email is required.',
    'auth/missing-password': 'Password is required.',
    'auth/admin-restricted-operation': 'New sign-ups are currently disabled. Please contact support.',
    'auth/password-does-not-meet-requirements': 'Password does not meet the security policy. Use at least 8 characters with uppercase, lowercase, number & symbol.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/cancelled-popup-request': 'The previous sign-in attempt was cancelled. Please try once more.',
    'auth/requires-recent-login': 'Your session expired. Please sign in again.',
    'auth/quota-exceeded': 'Temporary limit reached. Please try again later.',
    'auth/timeout': 'The request took too long. Please try again.',
    'permission-denied': 'We could not save your account data. Please try again or contact support.',
    unauthenticated: 'Your session expired. Please sign in again.',
    unavailable: 'Service temporarily unavailable. Check your connection and try again.',
    'deadline-exceeded': 'The connection took too long. Please try again.',
    'failed-precondition': 'This action cannot be completed right now. Try again shortly.',
    'resource-exhausted': 'Temporary limit reached. Please try again later.',
    'already-exists': 'This record already exists.',
    'not-found': 'The requested data was not found.',
    'invalid-argument': 'Some details are invalid. Please review and try again.',
    internal: 'An unexpected error occurred. Please try again.',
    'auth/unknown': 'Something went wrong. Please try again.',
    'auth/disposable-email': 'Temporary/fake emails are not allowed. Use a real email.',
    'auth/weak-password-common': 'This password is too common. Choose a stronger one.',
    'auth/password-mismatch': 'Passwords do not match.',
    'auth/password-too-weak': 'Password needs uppercase, lowercase, number & symbol (min 8 chars).',
    'auth/google-only-account': 'This account uses Google sign-in. No site password to reset — use Continue with Google on the Login page.',
    'auth/admin-account': 'This account is for the admin panel only. Sign in at /admin/login.',
    'auth/account-exists-with-different-credential': 'This email is already registered with another method. Sign in with email/password or the original method.',
  },
};

export function isDisposableEmail(email) {
  const domain = email?.trim().toLowerCase().split('@')[1];
  return domain ? DISPOSABLE_EMAIL_DOMAINS.has(domain) : false;
}

export function isStrongPassword(password) {
  if (!password || password.length < 8) return false;
  if (WEAK_PASSWORDS.has(password.toLowerCase())) return false;
  return /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

export function validateEmail(email, lang = 'ar') {
  const errors = [];
  const trimmed = email?.trim() || '';
  if (!trimmed) {
    errors.push(lang === 'ar' ? 'يرجى إدخال البريد الإلكتروني' : 'Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    errors.push(getFirebaseErrorMessage({ code: 'auth/invalid-email' }, lang));
  } else if (isDisposableEmail(trimmed)) {
    errors.push(getFirebaseErrorMessage({ code: 'auth/disposable-email' }, lang));
  }
  return { valid: errors.length === 0, errors, email: trimmed };
}

export function validateLoginForm({ email, password }, lang = 'ar') {
  const errors = [];
  const emailResult = validateEmail(email, lang);
  errors.push(...emailResult.errors);

  if (!password) {
    errors.push(getFirebaseErrorMessage({ code: 'auth/missing-password' }, lang));
  }

  return { valid: errors.length === 0, errors, email: emailResult.email };
}

/** Parse Firebase error code from various error shapes */
export function parseFirebaseErrorCode(error) {
  if (!error) return 'auth/unknown';

  // customData.message carries the raw REST reason behind auth/internal-error
  const detail = `${error.customData?.message || ''} ${error.message || ''}`;
  const reason = Object.keys(REST_REASON_CODES).find((token) => detail.includes(token));
  if (reason) return REST_REASON_CODES[reason];

  if (error.code) return error.code;
  if (detail.includes('permission-denied')) return 'permission-denied';

  return 'auth/unknown';
}

export function getFirebaseErrorMessage(error, lang = 'ar', context = 'auth') {
  const code = parseFirebaseErrorCode(error);
  const dict = ERROR_MESSAGES[lang] || ERROR_MESSAGES.ar;
  if (dict[code]) return dict[code];

  const generic = GENERIC_MESSAGES[lang] || GENERIC_MESSAGES.ar;
  return generic[context] || generic.auth;
}

/**
 * Log to console + show alert popup + return UI message
 * @param {Error} error - Firebase error
 * @param {string} context - e.g. 'register', 'login'
 * @param {string} lang - 'ar' | 'en'
 */
export function handleAuthError(error, context = 'auth', lang = 'ar', options = {}) {
  const { logConsole = true } = options;
  const code = parseFirebaseErrorCode(error);
  const userMessage = getFirebaseErrorMessage(error, lang, context);

  if (logConsole) {
    console.group(`🔴 Firebase Error [${context}]`);
    console.error('Code:', code);
    if (code !== error?.code) console.error('Raw code:', error?.code);
    console.error('Message:', error?.message);
    console.error('Full error:', error);
    if (error?.customData) console.error('Custom data:', error.customData);
    console.groupEnd();
  }

  return { message: userMessage, code };
}

/** Client-side validation before Firebase call */
export function validateRegisterForm({ email, password, confirmPassword, name, phone }, lang = 'ar') {
  const errors = [];

  if (!name?.trim()) {
    errors.push(lang === 'ar' ? 'يرجى إدخال الاسم الكامل' : 'Name is required');
  }

  const emailResult = validateEmail(email, lang);
  errors.push(...emailResult.errors);

  if (!phone?.trim()) {
    errors.push(lang === 'ar' ? 'يرجى إدخال رقم الجوال' : 'Mobile number is required');
  }

  if (!password) {
    errors.push(getFirebaseErrorMessage({ code: 'auth/missing-password' }, lang));
  } else if (WEAK_PASSWORDS.has(password.toLowerCase())) {
    errors.push(getFirebaseErrorMessage({ code: 'auth/weak-password-common' }, lang));
  } else if (!isStrongPassword(password)) {
    errors.push(getFirebaseErrorMessage({ code: 'auth/password-too-weak' }, lang));
  }

  if (password && confirmPassword && password !== confirmPassword) {
    errors.push(getFirebaseErrorMessage({ code: 'auth/password-mismatch' }, lang));
  }

  return { valid: errors.length === 0, errors, email: emailResult.email };
}
