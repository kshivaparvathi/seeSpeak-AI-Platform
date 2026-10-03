import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthStatus, AuthContextType } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check existing session via HTTP-only cookie
  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setStatus('authenticated');
          return;
        }
      }
      setUser(null);
      setStatus('unauthenticated');
    } catch (err) {
      console.warn('Session verification check failed:', err);
      setUser(null);
      setStatus('unauthenticated');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Sign In
  const login = async (identifier: string, password: string, captchaId: string, captchaCode: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          captcha_id: captchaId,
          captcha_code: captchaCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.detail || 'Failed to sign in. Please verify your credentials.',
        };
      }

      setUser(data.user);
      setStatus('authenticated');
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error occurred during login. Please try again.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Register
  const register = async (
    fullName: string,
    username: string,
    email: string,
    password: string,
    captchaId: string,
    captchaCode: string
  ) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          full_name: fullName.trim(),
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
          captcha_id: captchaId,
          captcha_code: captchaCode,
          terms_accepted: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.detail || 'Registration failed. Please review your details.',
        };
      }

      if (data.user) {
        setUser(data.user);
        setStatus('authenticated');
      }

      return {
        success: true,
        user: data.user,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network connection failed during registration.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Verify Email OTP
  const verifyEmail = async (email: string, otp: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.detail || 'Invalid verification code. Please try again.',
        };
      }

      if (data.user) {
        setUser(data.user);
        setStatus('authenticated');
      }
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Verification failed due to a network error.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const resendOtp = async (email: string) => {
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.detail || 'Could not resend code. Please try again later.',
        };
      }
      return {
        success: true,
        message: data.message || 'A new verification code has been dispatched.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error while resending verification code.',
      };
    }
  };

  // Forgot Password
  const forgotPassword = async (email: string, captchaId: string, captchaCode: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          captcha_id: captchaId,
          captcha_code: captchaCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.detail || 'Could not process password reset request.',
        };
      }
      return {
        success: true,
        message: data.message,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Password
  const resetPassword = async (token: string, newPassword: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          token: token.trim(),
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.detail || 'Password reset failed.',
        };
      }
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.warn('Logout endpoint call failed:', err);
    } finally {
      setUser(null);
      setStatus('unauthenticated');
      // Invalidate back navigation by replacing history state with /auth
      window.history.replaceState(null, '', '/auth');
    }
  };

  // Update Profile
  const updateProfile = async (updates: { full_name?: string; avatar_url?: string }) => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.detail || 'Could not update profile' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update profile' };
    }
  };

  // Change Password
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true };
      }
      return { success: false, error: data.detail || 'Could not change password' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to change password' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        isLoading,
        login,
        register,
        verifyEmail,
        resendOtp,
        forgotPassword,
        resetPassword,
        logout,
        checkAuth,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
