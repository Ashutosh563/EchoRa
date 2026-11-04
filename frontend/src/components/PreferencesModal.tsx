import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Heart, Ban, Sparkles } from 'lucide-react';
import type { StoredProfile, UserPreferences } from '../types/discovery';
import {
  getStoredProfile,
  addPreference,
  removePreference,
  clearPreferencesAndHistory,
} from '../services/preferenceStorage';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (profile: StoredProfile) => void;
  onNotify?: (message: string, type: 'info' | 'success' | 'error') => void;
}

export function PreferencesModal({
  isOpen,
  onClose,
  onProfileUpdated,
  onNotify,
}: PreferencesModalProps) {
  const profile = getStoredProfile();
  const [activeTab, setActiveTab] = useState<'favorites' | 'dislikes'>('favorites');
  const [genreInput, setGenreInput] = useState('');
  const [artistInput, setArtistInput] = useState('');

  if (!isOpen) return null;

  const handleAddPreference = (
    category: keyof UserPreferences,
    value: string,
    clearInput: () => void,
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const updated = addPreference(category, trimmed);
    clearInput();
    onProfileUpdated(updated);
    onNotify?.(`Added "${trimmed}" to your preferences.`, 'success');
  };

  const handleRemovePreference = (category: keyof UserPreferences, item: string) => {
    const updated = removePreference(category, item);
    onProfileUpdated(updated);
    onNotify?.(`Removed "${item}".`, 'info');
  };

  const handleClearAll = () => {
    if (window.confirm('Reset all preferences, interaction history, and discovery mode to Familiar?')) {
      const reset = clearPreferencesAndHistory();
      onProfileUpdated(reset);
      onNotify?.('All preferences and history cleared. Mode reset to Familiar.', 'info');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-ink/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="preferences-modal-title"
          className="relative w-full max-w-lg glass-panel bg-ink/90 border border-white/15 p-6 rounded-2xl shadow-glass-elevated z-10 flex flex-col max-h-[85vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-violet/20 border border-violet/30 flex items-center justify-center text-violet">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 id="preferences-modal-title" className="font-display font-bold text-lg text-text">
                  Taste Preferences
                </h2>
                <p className="text-xs text-text-dim">
                  Personalize Familiar and Balanced discovery modes
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close preferences"
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-dim hover:text-text hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 pt-4 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('favorites')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'favorites'
                  ? 'bg-violet/20 border border-violet/40 text-violet-light'
                  : 'text-text-dim hover:text-text hover:bg-white/5 border border-transparent'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Favorites</span>
              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">
                {profile.preferences.favoriteGenres.length + profile.preferences.favoriteArtists.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dislikes')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'dislikes'
                  ? 'bg-magenta/20 border border-magenta/40 text-pink-300'
                  : 'text-text-dim hover:text-text hover:bg-white/5 border border-transparent'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Dislikes & Exclusions</span>
              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">
                {profile.preferences.dislikedGenres.length + profile.preferences.dislikedArtists.length}
              </span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto space-y-5 py-2 pr-1">
            {activeTab === 'favorites' ? (
              <>
                {/* Favorite Genres */}
                <div className="space-y-2">
                  <label htmlFor="pref-fav-genre-input" className="block text-xs font-medium text-text-dim">
                    Favorite Genres
                  </label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddPreference('favoriteGenres', genreInput, () => setGenreInput(''));
                    }}
                    className="flex gap-2"
                  >
                    <input
                      id="pref-fav-genre-input"
                      type="text"
                      value={genreInput}
                      onChange={(e) => setGenreInput(e.target.value)}
                      placeholder="e.g. Indie, Jazz, Synthwave, Lo-Fi"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-text placeholder-text-faint focus:outline-none focus:border-violet/50"
                    />
                    <button
                      type="submit"
                      disabled={!genreInput.trim()}
                      className="px-3 py-1.5 rounded-lg bg-violet/30 hover:bg-violet/50 disabled:opacity-40 text-xs font-medium text-white flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </form>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {profile.preferences.favoriteGenres.length === 0 ? (
                      <p className="text-xs text-text-faint italic">No favorite genres added yet.</p>
                    ) : (
                      profile.preferences.favoriteGenres.map((genre) => (
                        <span
                          key={genre}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 border border-white/15 text-text"
                        >
                          {genre}
                          <button
                            type="button"
                            onClick={() => handleRemovePreference('favoriteGenres', genre)}
                            className="hover:text-red-400 cursor-pointer"
                            aria-label={`Remove favorite genre ${genre}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Favorite Artists */}
                <div className="space-y-2 pt-2">
                  <label htmlFor="pref-fav-artist-input" className="block text-xs font-medium text-text-dim">
                    Favorite Artists
                  </label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddPreference('favoriteArtists', artistInput, () => setArtistInput(''));
                    }}
                    className="flex gap-2"
                  >
                    <input
                      id="pref-fav-artist-input"
                      type="text"
                      value={artistInput}
                      onChange={(e) => setArtistInput(e.target.value)}
                      placeholder="e.g. Bon Iver, Radiohead, Tycho"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-text placeholder-text-faint focus:outline-none focus:border-violet/50"
                    />
                    <button
                      type="submit"
                      disabled={!artistInput.trim()}
                      className="px-3 py-1.5 rounded-lg bg-violet/30 hover:bg-violet/50 disabled:opacity-40 text-xs font-medium text-white flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </form>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {profile.preferences.favoriteArtists.length === 0 ? (
                      <p className="text-xs text-text-faint italic">No favorite artists added yet.</p>
                    ) : (
                      profile.preferences.favoriteArtists.map((artist) => (
                        <span
                          key={artist}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 border border-white/15 text-text"
                        >
                          {artist}
                          <button
                            type="button"
                            onClick={() => handleRemovePreference('favoriteArtists', artist)}
                            className="hover:text-red-400 cursor-pointer"
                            aria-label={`Remove favorite artist ${artist}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Disliked Genres */}
                <div className="space-y-2">
                  <label htmlFor="pref-disliked-genre-input" className="block text-xs font-medium text-text-dim">
                    Disliked Genres (Filtered out)
                  </label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddPreference('dislikedGenres', genreInput, () => setGenreInput(''));
                    }}
                    className="flex gap-2"
                  >
                    <input
                      id="pref-disliked-genre-input"
                      type="text"
                      value={genreInput}
                      onChange={(e) => setGenreInput(e.target.value)}
                      placeholder="e.g. Metal, Country, Hardcore"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-text placeholder-text-faint focus:outline-none focus:border-magenta/50"
                    />
                    <button
                      type="submit"
                      disabled={!genreInput.trim()}
                      className="px-3 py-1.5 rounded-lg bg-magenta/30 hover:bg-magenta/50 disabled:opacity-40 text-xs font-medium text-white flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </form>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {profile.preferences.dislikedGenres.length === 0 ? (
                      <p className="text-xs text-text-faint italic">No excluded genres.</p>
                    ) : (
                      profile.preferences.dislikedGenres.map((genre) => (
                        <span
                          key={genre}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-300"
                        >
                          {genre}
                          <button
                            type="button"
                            onClick={() => handleRemovePreference('dislikedGenres', genre)}
                            className="hover:text-white cursor-pointer"
                            aria-label={`Remove disliked genre ${genre}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Disliked Artists */}
                <div className="space-y-2 pt-2">
                  <label htmlFor="pref-disliked-artist-input" className="block text-xs font-medium text-text-dim">
                    Disliked Artists (Filtered out)
                  </label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddPreference('dislikedArtists', artistInput, () => setArtistInput(''));
                    }}
                    className="flex gap-2"
                  >
                    <input
                      id="pref-disliked-artist-input"
                      type="text"
                      value={artistInput}
                      onChange={(e) => setArtistInput(e.target.value)}
                      placeholder="e.g. Artist to exclude"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-text placeholder-text-faint focus:outline-none focus:border-magenta/50"
                    />
                    <button
                      type="submit"
                      disabled={!artistInput.trim()}
                      className="px-3 py-1.5 rounded-lg bg-magenta/30 hover:bg-magenta/50 disabled:opacity-40 text-xs font-medium text-white flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </form>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {profile.preferences.dislikedArtists.length === 0 ? (
                      <p className="text-xs text-text-faint italic">No excluded artists.</p>
                    ) : (
                      profile.preferences.dislikedArtists.map((artist) => (
                        <span
                          key={artist}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-300"
                        >
                          {artist}
                          <button
                            type="button"
                            onClick={() => handleRemovePreference('dislikedArtists', artist)}
                            className="hover:text-white cursor-pointer"
                            aria-label={`Remove disliked artist ${artist}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer with Reset Action */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors cursor-pointer py-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset to Default (Familiar)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-text transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
