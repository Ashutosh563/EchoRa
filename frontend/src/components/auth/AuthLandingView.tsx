import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Wordmark } from '../Wordmark';
import { Sparkles, Compass, Shield, ArrowRight, Loader2 } from 'lucide-react';

export function AuthLandingView() {
  const { signInWithSpotify, signInWithGoogle, continueAsGuest } = useAuth();
  const [isSpotifyLoading, setIsSpotifyLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSpotify = async () => {
    setIsSpotifyLoading(true);
    setAuthError(null);
    const { error } = await signInWithSpotify();
    if (error) {
      setAuthError(error.message);
      setIsSpotifyLoading(false);
    }
  };

  const handleGoogle = async () => {
    setIsGoogleLoading(true);
    setAuthError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setAuthError(error.message);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-12 overflow-hidden bg-ink">
      {/* Ambient Aurora Glow Circles */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-violet/25 via-cyan/20 to-teal/15 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/3 w-[450px] h-[300px] bg-gradient-to-br from-amber/15 via-violet/15 to-transparent blur-[140px] rounded-full pointer-events-none -z-10" />

      {/* Main Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md mx-auto p-8 sm:p-10 rounded-3xl bg-white/[0.04] border border-white/[0.12] backdrop-blur-2xl shadow-2xl shadow-black/50 relative overflow-hidden"
      >
        {/* Subtle Top Gradient Highlight */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet/50 to-transparent" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-4 scale-110">
            <Wordmark />
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-text tracking-tight mb-2">
            Bridge emotion with sound.
          </h1>
          <p className="text-sm text-text-dim leading-relaxed max-w-sm">
            Sign in to unlock personalized AI mood discovery, build emotional transition journeys, and save your soundscapes.
          </p>
        </div>

        {/* Auth Error Notification */}
        {authError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center leading-relaxed"
          >
            {authError}
          </motion.div>
        )}

        {/* OAuth Action Buttons */}
        <div className="flex flex-col gap-3.5 mb-6">
          {/* Path 1: Spotify */}
          <button
            type="button"
            onClick={handleSpotify}
            disabled={isSpotifyLoading || isGoogleLoading}
            className="group relative w-full h-12 px-5 rounded-2xl bg-[#1DB954] hover:bg-[#1ed760] active:scale-[0.98] text-black font-semibold text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-lg shadow-[#1DB954]/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSpotifyLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-black" />
            ) : (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.498 17.303c-.215.352-.676.464-1.028.249-2.817-1.722-6.362-2.111-10.537-1.157-.403.093-.805-.158-.897-.561-.093-.404.158-.805.561-.898 4.568-1.045 8.49-.607 11.652 1.339.352.215.464.676.249 1.028zm1.467-3.262c-.27.44-.849.579-1.289.309-3.224-1.982-8.14-2.557-11.954-1.399-.497.151-1.025-.133-1.176-.63-.151-.497.133-1.025.63-1.176 4.358-1.323 9.775-.681 13.48 1.597.44.27.579.849.309 1.289zm.126-3.41c-3.867-2.296-10.25-2.508-13.94-1.387-.594.18-1.226-.156-1.406-.75-.18-.594.156-1.226.75-1.406 4.243-1.288 11.295-1.041 15.748 1.602.534.317.708 1.01.391 1.544-.317.534-1.01.708-1.543.397z" />
              </svg>
            )}
            <span>{isSpotifyLoading ? 'Connecting to Spotify...' : 'Continue with Spotify'}</span>
          </button>

          {/* Path 2: Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isSpotifyLoading || isGoogleLoading}
            className="group relative w-full h-12 px-5 rounded-2xl bg-white/[0.07] hover:bg-white/[0.12] active:scale-[0.98] border border-white/15 text-white font-medium text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>
        </div>

        {/* Feature Pills */}
        <div className="pt-6 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-text-muted mb-6">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet" />
            <span>AI Intent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan" />
            <span>Mood Flow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-teal" />
            <span>Private</span>
          </div>
        </div>

        {/* Guest Mode Action */}
        <div className="text-center">
          <button
            type="button"
            onClick={continueAsGuest}
            className="inline-flex items-center gap-1.5 text-xs text-text-dim hover:text-white transition-colors cursor-pointer group"
          >
            <span>Explore as guest first</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
