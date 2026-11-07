import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { ModeSelector } from '../src/components/ModeSelector';
import { PreferencesModal } from '../src/components/PreferencesModal';
import {
  getStoredProfile,
  setDiscoveryMode,
} from '../src/services/preferenceStorage';

describe('Discovery Modes Frontend Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('ModeSelector Component', () => {
    it('defaults to Familiar and renders all 3 options', () => {
      const onChange = vi.fn();
      render(<ModeSelector currentMode="FAMILIAR" onChange={onChange} />);

      const familiarRadio = screen.getByRole('radio', { name: /familiar/i });
      const balancedRadio = screen.getByRole('radio', { name: /balanced/i });
      const exploreRadio = screen.getByRole('radio', { name: /explore/i });

      expect(familiarRadio).toBeInTheDocument();
      expect(balancedRadio).toBeInTheDocument();
      expect(exploreRadio).toBeInTheDocument();

      expect(familiarRadio).toHaveAttribute('aria-checked', 'true');
      expect(balancedRadio).toHaveAttribute('aria-checked', 'false');
      expect(exploreRadio).toHaveAttribute('aria-checked', 'false');
    });

    it('triggers onChange with new mode when clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ModeSelector currentMode="FAMILIAR" onChange={onChange} />);

      const balancedRadio = screen.getByRole('radio', { name: /balanced/i });
      await user.click(balancedRadio);

      expect(onChange).toHaveBeenCalledWith('BALANCED');
    });
  });

  describe('PreferencesModal Component', () => {
    it('allows adding and removing favorite genres', async () => {
      const user = userEvent.setup();
      const onProfileUpdated = vi.fn();
      render(
        <PreferencesModal
          isOpen={true}
          onClose={vi.fn()}
          onProfileUpdated={onProfileUpdated}
        />
      );

      const input = screen.getByPlaceholderText(/indie, jazz/i);
      await user.type(input, 'Indie Pop');
      await user.click(screen.getAllByRole('button', { name: /add/i })[0]);

      expect(onProfileUpdated).toHaveBeenCalled();
      const stored = getStoredProfile();
      expect(stored.preferences.favoriteGenres).toContain('Indie Pop');
    });

    it('clears all preferences and resets discovery mode to Familiar', async () => {
      setDiscoveryMode('EXPLORE');
      const user = userEvent.setup();
      const onProfileUpdated = vi.fn();

      // Mock window.confirm to return true
      vi.spyOn(window, 'confirm').mockImplementation(() => true);

      render(
        <PreferencesModal
          isOpen={true}
          onClose={vi.fn()}
          onProfileUpdated={onProfileUpdated}
        />
      );

      const resetBtn = screen.getByRole('button', { name: /reset to default/i });
      await user.click(resetBtn);

      const stored = getStoredProfile();
      expect(stored.discoveryMode).toBe('FAMILIAR');
      expect(stored.preferences.favoriteGenres).toEqual([]);
    });
  });

  describe('App Discovery Mode Persistence', () => {
    it('starts in Familiar mode when localStorage is empty', async () => {
      await act(async () => {
        render(<App />);
      });
      const familiarRadio = screen.getByRole('radio', { name: /familiar/i });
      expect(familiarRadio).toHaveAttribute('aria-checked', 'true');
    });

    it('restores previously saved Balanced mode on mount', async () => {
      setDiscoveryMode('BALANCED');
      await act(async () => {
        render(<App />);
      });
      const balancedRadio = screen.getByRole('radio', { name: /balanced/i });
      expect(balancedRadio).toHaveAttribute('aria-checked', 'true');
    });

    it('restores previously saved Explore mode on mount', async () => {
      setDiscoveryMode('EXPLORE');
      await act(async () => {
        render(<App />);
      });
      const exploreRadio = screen.getByRole('radio', { name: /explore/i });
      expect(exploreRadio).toHaveAttribute('aria-checked', 'true');
    });

    it('falls back to Familiar mode when stored mode is invalid', async () => {
      localStorage.setItem('echora_discovery_profile_v1', JSON.stringify({
        version: 1,
        discoveryMode: 'NON_EXISTENT_MODE',
        preferences: { favoriteGenres: [], favoriteArtists: [], dislikedGenres: [], dislikedArtists: [] },
      }));

      await act(async () => {
        render(<App />);
      });
      const familiarRadio = screen.getByRole('radio', { name: /familiar/i });
      expect(familiarRadio).toHaveAttribute('aria-checked', 'true');
    });

    it('switches modes immediately when user selects a different mode', async () => {
      const user = userEvent.setup();
      await act(async () => {
        render(<App />);
      });

      const exploreRadio = screen.getByRole('radio', { name: /explore/i });
      await user.click(exploreRadio);

      expect(exploreRadio).toHaveAttribute('aria-checked', 'true');
      expect(getStoredProfile().discoveryMode).toBe('EXPLORE');
    });
  });
});
