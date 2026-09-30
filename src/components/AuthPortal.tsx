import React, { useState } from 'react';
import { GENERATED_IMAGES } from '../data/seedData';
import { UserProfile } from '../types';
import { handleFileToDataUrl } from './Modals';
import { ResilientImage, UserAvatar } from './ResilientMedia';

interface AuthPortalProps {
  demoUsers: UserProfile[];
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (payload: {
    full_name: string;
    username: string;
    email: string;
    password: string;
    profile_picture?: string;
    bio?: string;
    location?: string;
    website?: string;
  }) => Promise<void>;
  onForgotPassword: (email: string, newPassword?: string) => Promise<void>;
  onToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  demoUsers,
  onLogin,
  onRegister,
  onForgotPassword,
  onToast,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginIdentifier, setLoginIdentifier] = useState('elena_rostova');
  const [loginPassword, setLoginPassword] = useState('AetherPass2026!');

  // Register state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('elena@aether.social');
  const [newPassword, setNewPassword] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword) {
      onToast('error', 'Missing credentials', 'Please enter your username/email and password.');
      return;
    }
    setLoading(true);
    try {
      await onLogin(loginIdentifier.trim(), loginPassword);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !email.trim() || !password) {
      onToast('error', 'Incomplete form', 'Full name, username, email, and password are required.');
      return;
    }
    if (password.length < 8) {
      onToast('error', 'Weak password', 'Password must contain at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await onRegister({
        full_name: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        profile_picture: profilePic,
        location: location.trim(),
        bio: bio.trim(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      onToast('error', 'Email required', 'Enter your registered email address.');
      return;
    }
    setLoading(true);
    try {
      await onForgotPassword(forgotEmail.trim(), newPassword || undefined);
      setMode('login');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await handleFileToDataUrl(file);
      setProfilePic(dataUrl);
    } catch (err: any) {
      onToast('error', 'Invalid image', err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F17] flex flex-col justify-between">
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center flex-1">
        {/* Left Editorial Feature Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <h1
              className="font-display text-4xl sm:text-5xl text-slate-900 dark:text-slate-100 tracking-tight leading-[1.1]"
              style={{ textWrap: 'balance' }}
            >
              Connectra — The Editorial Network for Spatial, Visual & Systems Craft.
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              Share architectural monographs, studio works-in-progress, medium-format photography,
              and technical dispatches with a community built around deliberate craft.
            </p>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
            <ResilientImage
              src={GENERATED_IMAGES.pavilion}
              alt="Lake Como Architectural Pavilion"
              className="w-full h-64 sm:h-80 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-6">
              <p className="font-display text-xl text-white">
                “Architecture should age with dignity rather than fight patina.”
              </p>
              <p className="text-xs text-slate-300 mt-1">
                Elena Rostova · Principal Spatial Architect · ETH Zurich
              </p>
            </div>
          </div>

          {/* Demo Accounts Quick Switcher */}
          <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Instant Demo Accounts (Click any creator to autofill & sign in)
              </p>
              <span className="text-[11px] font-mono-tabular text-slate-500">
                Password: AetherPass2026!
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {demoUsers.slice(0, 5).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLoginIdentifier(u.username);
                    setLoginPassword('AetherPass2026!');
                    onLogin(u.username, 'AetherPass2026!');
                  }}
                  className="p-2 rounded-xl border border-slate-200/70 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 flex flex-col items-center text-center transition-colors bg-slate-50/50 dark:bg-slate-900/40"
                >
                  <UserAvatar
                    src={u.profile_picture}
                    alt={u.full_name}
                    name={u.full_name}
                    size="sm"
                    isOnline={u.is_online}
                  />
                  <span className="text-xs font-medium text-slate-900 dark:text-slate-100 mt-1.5 truncate w-full">
                    {u.full_name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate w-full">
                    @{u.username}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Authentication Card */}
        <div className="lg:col-span-5 bg-white dark:bg-[#131822] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Segmented Mode Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0D1119] rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-white dark:bg-[#181F2C] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-white dark:bg-[#181F2C] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                mode === 'forgot'
                  ? 'bg-white dark:bg-[#181F2C] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Reset Password
            </button>
          </div>

          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Welcome back
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter your credentials or select a seeded creator account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Username or Email
                </label>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="elena_rostova or elena@aether.social"
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs text-blue-700 dark:text-blue-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity"
              >
                {loading ? 'Signing in...' : 'Sign In to Connectra'}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Create your account
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Join the network with full profile customization.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <UserAvatar
                  src={profilePic}
                  alt={fullName || 'New User'}
                  name={fullName || 'AU'}
                  size="md"
                />
                <label className="cursor-pointer px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-200 inline-flex items-center gap-1.5">
                  <i className="fa-solid fa-upload" aria-hidden="true" />
                  <span>Upload Profile Picture</span>
                  <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ada Lovelace"
                    required
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ada_lovelace"
                    required
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ada@aether.social"
                  required
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password (minimum 8 characters) *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Location & Bio (Optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="London, UK · Analytical Engine Architect"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-medium bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition-colors"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Reset your password
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter your account email and choose a new password (min 8 characters).
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Registered Email
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password (min 8 chars)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  placeholder="Enter new password..."
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:opacity-90"
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
