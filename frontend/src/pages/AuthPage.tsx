import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  KeyRound, 
  RotateCw, 
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { VisualCaptcha } from '../components/auth/VisualCaptcha';
import { AuthMode } from '../types/auth';

interface AuthPageProps {
  initialMode?: AuthMode;
  onSuccess?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ 
  initialMode = 'register', // Official Registration / Sign Up default
  onSuccess 
}) => {
  const { login, register, forgotPassword, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Visual CAPTCHA state
  const [captchaId, setCaptchaId] = useState<string>('');
  const [captchaCode, setCaptchaCode] = useState<string>('');
  const [captchaResetSignal, setCaptchaResetSignal] = useState<number>(0);

  // Reset Token
  const [resetToken, setResetToken] = useState('');

  // Live username validation
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    valid?: boolean;
    available?: boolean;
    message?: string;
  }>({ checking: false });

  // Read URL query params for reset token or specific mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    const emailParam = params.get('email');
    const modeParam = params.get('mode') as AuthMode;

    if (tokenParam) {
      setResetToken(tokenParam);
      setMode('reset');
    } else if (modeParam && ['signin', 'register', 'forgot', 'reset'].includes(modeParam)) {
      setMode(modeParam);
    }

    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  // Username live debounce check
  useEffect(() => {
    if (mode !== 'register' || !username.trim()) {
      setUsernameStatus({ checking: false });
      return;
    }

    const clean = username.trim();
    if (clean.length < 3) {
      setUsernameStatus({
        checking: false,
        valid: false,
        message: 'Min 3 chars',
      });
      return;
    }

    const regex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!regex.test(clean)) {
      setUsernameStatus({
        checking: false,
        valid: false,
        message: 'Only letters, numbers, underscores (3-20)',
      });
      return;
    }

    setUsernameStatus({ checking: true });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(clean)}`);
        if (res.ok) {
          const data = await res.json();
          setUsernameStatus({
            checking: false,
            valid: data.valid,
            available: data.available,
            message: data.message,
          });
        }
      } catch {
        setUsernameStatus({ checking: false });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, mode]);

  // Switch mode helper
  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMsg(null);
    setCaptchaCode('');
    setCaptchaResetSignal((prev) => prev + 1);
  };

  // Sign In submit
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setError('Please enter your email or username');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }
    if (!captchaCode.trim() || !captchaId) {
      setError('Please enter the security CAPTCHA code shown.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password, captchaId, captchaCode);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Failed to sign in. Please verify your credentials.');
      setCaptchaResetSignal((prev) => prev + 1);
      setCaptchaCode('');
      return;
    }

    onSuccess?.();
  };

  // Register / Sign Up submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!username.trim() || usernameStatus.available === false) {
      setError('Please enter an available username.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!termsAccepted) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }
    if (!captchaCode.trim() || !captchaId) {
      setError('Please enter the security CAPTCHA code shown.');
      return;
    }

    setIsSubmitting(true);
    const result = await register(fullName, username, email, password, captchaId, captchaCode);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Registration failed.');
      setCaptchaResetSignal((prev) => prev + 1);
      setCaptchaCode('');
      return;
    }

    setSuccessMsg('Account created successfully! Welcome to seeSpeak AI.');
    onSuccess?.();
  };

  // Forgot password submit
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter your registered email address.');
      return;
    }
    if (!captchaCode.trim() || !captchaId) {
      setError('Please enter the security CAPTCHA code shown.');
      return;
    }

    setIsSubmitting(true);
    const result = await forgotPassword(email, captchaId, captchaCode);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Could not process password reset.');
      setCaptchaResetSignal((prev) => prev + 1);
      setCaptchaCode('');
      return;
    }

    setSuccessMsg(result.message || 'Password reset link sent to your email.');
    switchMode('reset');
  };

  // Reset password submit
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!resetToken.trim()) {
      setError('Please enter the reset token from your email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword(resetToken, password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Failed to reset password.');
      return;
    }

    setSuccessMsg('Password updated successfully! Please sign in with your new password.');
    setPassword('');
    setConfirmPassword('');
    switchMode('signin');
  };

  return (
    <div className="min-h-screen w-full py-8 px-4 sm:px-6 lg:px-12 flex items-center justify-center overflow-y-auto bg-gradient-to-br from-[#edf2fa] via-[#f3f7fc] to-[#e4ecf7] text-slate-800 font-sans">
      
      {/* 2-Column Responsive Layout matching the exact attached reference image */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 my-auto">
        
        {/* ========================================================
            LEFT COLUMN: EXACT 3D AI COMPANION SHOWCASE FROM IMAGE
           ======================================================== */}
        <div className="hidden lg:flex flex-col items-center justify-center w-full max-w-[460px] shrink-0 select-none">
          <img 
            src="/ref_left_side.png" 
            alt="seeSpeak AI - Your AI Companion for a Smarter Tomorrow" 
            className="w-full h-auto object-contain drop-shadow-lg"
          />
        </div>

        {/* Small Screen Mobile/Tablet Brand Header (Shown only on small screens < 1024px) */}
        <div className="lg:hidden w-full max-w-[440px] text-center mb-1">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm mb-2">
            <div className="flex items-center gap-0.5 h-6 px-1.5 py-1 rounded-lg bg-gradient-to-tr from-sky-400 via-indigo-500 to-purple-600 text-white">
              <span className="w-0.5 h-2.5 bg-white rounded-full" />
              <span className="w-0.5 h-4 bg-white rounded-full" />
              <span className="w-0.5 h-2 bg-white rounded-full" />
              <span className="w-0.5 h-3.5 bg-white rounded-full" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">
              seeSpeak AI
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Your AI Companion for a Smarter Tomorrow
          </h2>
        </div>

        {/* ========================================================
            RIGHT COLUMN: EXACT REGISTRATION / SIGN UP CARD
           ======================================================== */}
        <div className="w-full max-w-[460px] shrink-0">
          <div className="w-full bg-white rounded-[28px] border border-slate-100 shadow-[0_20px_50px_-15px_rgba(99,102,241,0.08),0_10px_25px_-5px_rgba(0,0,0,0.03)] p-6 sm:p-8">
            
            {/* Top Header Row: Category Label & Sign In Pill */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-slate-500">
                {mode === 'register' && 'Create Your Account'}
                {mode === 'signin' && 'Sign In to Your Account'}
                {mode === 'forgot' && 'Account Recovery'}
                {mode === 'reset' && 'Password Reset'}
              </span>

              {mode === 'register' && (
                <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
                  <span className="hidden sm:inline">Already have an account?</span>
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="px-3 py-1 rounded-full bg-[#eef2f9] hover:bg-[#e2e8f0] text-slate-700 font-semibold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Sign In</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              )}

              {mode === 'signin' && (
                <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
                  <span className="hidden sm:inline">New to seeSpeak AI?</span>
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="px-3 py-1 rounded-full bg-[#eef2f9] hover:bg-[#e2e8f0] text-slate-700 font-semibold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Sign Up</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Main Title & Subtitle */}
            <div className="mb-4">
              <h1 className="text-[23px] sm:text-[25px] font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                {mode === 'register' && (
                  <>
                    <span>Join seeSpeak AI</span>
                    <span className="text-xl">👋</span>
                  </>
                )}
                {mode === 'signin' && (
                  <>
                    <span>Welcome Back</span>
                    <span className="text-xl">👋</span>
                  </>
                )}
                {mode === 'forgot' && 'Reset Your Password'}
                {mode === 'reset' && 'Create New Password'}
              </h1>
              <p className="text-[12px] text-slate-500 mt-1 leading-normal">
                {mode === 'register' && 'Get started with your free account and unlock a world of AI-powered possibilities.'}
                {mode === 'signin' && 'Sign in to seeSpeak AI and continue using real-time multimodal AI.'}
                {mode === 'forgot' && 'Enter your email address to receive password reset instructions.'}
                {mode === 'reset' && 'Choose a strong new password for your account.'}
              </p>
            </div>

            {/* Error & Success Feedback Banners */}
            {error && (
              <div className="mb-3.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-fadeIn">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <div className="flex-1 leading-tight">{error}</div>
              </div>
            )}

            {successMsg && (
              <div className="mb-3.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2 animate-fadeIn">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                <div className="flex-1 leading-tight">{successMsg}</div>
              </div>
            )}

            {/* ========================================================
                1. SIGN UP / REGISTRATION FORM (EXACT REPRODUCTION)
               ======================================================== */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3">
                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full h-10 bg-white border border-[#e2e8f0] text-slate-800 placeholder-slate-400 rounded-xl pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Username <span className="text-rose-500">*</span>
                    </label>
                    {username.trim() && (
                      <span className={`text-[10px] font-medium ${
                        usernameStatus.available === true
                          ? 'text-emerald-600'
                          : usernameStatus.available === false
                          ? 'text-rose-600'
                          : 'text-slate-400'
                      }`}>
                        {usernameStatus.checking ? 'Checking...' : usernameStatus.message}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <UserIcon size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="Choose a username"
                      className="w-full h-10 bg-white border border-[#e2e8f0] text-slate-800 placeholder-slate-400 rounded-xl pl-9 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                    {usernameStatus.available === true && (
                      <CheckCircle2 size={15} className="absolute right-3 top-2.5 text-emerald-500" />
                    )}
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full h-10 bg-white border border-[#e2e8f0] text-slate-800 placeholder-slate-400 rounded-xl pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Password & Confirm Password (Side-by-Side in 2 Columns) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        className="w-full h-10 bg-white border border-[#e2e8f0] text-slate-800 placeholder-slate-400 rounded-xl pl-8 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Confirm Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="w-full h-10 bg-white border border-[#e2e8f0] text-slate-800 placeholder-slate-400 rounded-xl pl-8 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Real Visual CAPTCHA Section matching visual placement */}
                <div className="pt-0.5">
                  <VisualCaptcha
                    captchaId={captchaId}
                    captchaCode={captchaCode}
                    onCaptchaChange={setCaptchaCode}
                    onCaptchaIdChange={setCaptchaId}
                    resetSignal={captchaResetSignal}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Terms & Privacy Checkbox */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="checkbox"
                    id="termsCheckbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="termsCheckbox" className="text-[11px] text-slate-600 cursor-pointer select-none">
                    I agree to the <span className="text-indigo-600 hover:underline">Terms of Service</span> and <span className="text-indigo-600 hover:underline">Privacy Policy</span>
                  </label>
                </div>

                {/* CRITICAL: CREATE ACCOUNT BUTTON — ALWAYS FULLY VISIBLE & CLICKABLE */}
                <button
                  type="submit"
                  disabled={isSubmitting || !captchaCode.trim() || !captchaId || (usernameStatus.available === false)}
                  className="w-full h-11 mt-1 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7562f7] to-[#8b5cf6] hover:from-[#5558e6] hover:to-[#7c4ee6] text-white font-semibold text-[13px] shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw size={15} className="animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>

                {/* Bottom link: Sign In */}
                <div className="text-center pt-2">
                  <span className="text-xs text-slate-500">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Sign In Now
                    </button>
                  </span>
                </div>
              </form>
            )}

            {/* ========================================================
                2. SIGN IN FORM
               ======================================================== */}
            {mode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Email or Username <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com or username"
                      className="w-full h-10 bg-white border border-[#e2e8f0] text-slate-800 placeholder-slate-400 rounded-xl pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full h-10 bg-white border border-[#e2e8f0] text-slate-800 placeholder-slate-400 rounded-xl pl-8 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Visual CAPTCHA */}
                <div className="pt-0.5">
                  <VisualCaptcha
                    captchaId={captchaId}
                    captchaCode={captchaCode}
                    onCaptchaChange={setCaptchaCode}
                    onCaptchaIdChange={setCaptchaId}
                    resetSignal={captchaResetSignal}
                    disabled={isSubmitting}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !captchaCode.trim() || !captchaId}
                  className="w-full h-11 mt-1 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7562f7] to-[#8b5cf6] hover:from-[#5558e6] hover:to-[#7c4ee6] text-white font-semibold text-[13px] shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw size={15} className="animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <span className="text-xs text-slate-500">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Sign Up Now
                    </button>
                  </span>
                </div>
              </form>
            )}

            {/* ========================================================
                3. FORGOT PASSWORD
               ======================================================== */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Registered Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full h-10 bg-white border border-[#e2e8f0] text-slate-800 placeholder-slate-400 rounded-xl pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-0.5">
                  <VisualCaptcha
                    captchaId={captchaId}
                    captchaCode={captchaCode}
                    onCaptchaChange={setCaptchaCode}
                    onCaptchaIdChange={setCaptchaId}
                    resetSignal={captchaResetSignal}
                    disabled={isSubmitting}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !captchaCode.trim() || !captchaId}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7562f7] to-[#8b5cf6] hover:from-[#5558e6] hover:to-[#7c4ee6] text-white font-semibold text-[13px] shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw size={15} className="animate-spin" />
                      <span>Sending Instructions...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Instructions</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft size={13} /> Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* ========================================================
                5. RESET PASSWORD
               ======================================================== */}
            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Reset Token <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Paste reset token from email"
                      className="w-full h-10 bg-white border border-[#e2e8f0] text-slate-800 placeholder-slate-400 rounded-xl pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full h-10 bg-white border border-[#e2e8f0] text-slate-800 placeholder-slate-400 rounded-xl pl-8 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full h-10 bg-white border border-[#e2e8f0] text-slate-800 placeholder-slate-400 rounded-xl pl-8 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !resetToken.trim()}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7562f7] to-[#8b5cf6] hover:from-[#5558e6] hover:to-[#7c4ee6] text-white font-semibold text-[13px] shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw size={15} className="animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <CheckCircle2 size={15} />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft size={13} /> Back to Sign In
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};
