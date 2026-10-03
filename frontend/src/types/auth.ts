export interface User {
  id: string;
  full_name: string;
  username: string;
  email: string;
  email_verified: boolean;
  account_status: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
  last_login_at?: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type AuthMode = 'signin' | 'register' | 'forgot' | 'reset';

export interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  isLoading: boolean;
  login: (identifier: string, password: string, captchaId: string, captchaCode: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  register: (
    fullName: string,
    username: string,
    email: string,
    password: string,
    captchaId: string,
    captchaCode: string
  ) => Promise<{
    success: boolean;
    error?: string;
    user?: User;
  }>;
  verifyEmail: (email: string, otp: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  resendOtp: (email: string) => Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }>;
  forgotPassword: (email: string, captchaId: string, captchaCode: string) => Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }>;
  resetPassword: (token: string, newPassword: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (updates: { full_name?: string; avatar_url?: string }) => Promise<{
    success: boolean;
    error?: string;
  }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
}
