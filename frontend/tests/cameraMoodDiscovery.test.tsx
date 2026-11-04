import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import App from '../src/App';
import type { CameraAnalysisResponse } from '../src/types/camera';
import { CameraModal } from '../src/components/CameraModal';
import * as client from '../src/api/client';

describe('Camera-Based Mood Discovery', () => {
  let mockMediaDevices: any;

  beforeEach(() => {
    mockMediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }),
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      value: mockMediaDevices,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Scenario A (HIGH confidence): automatically proceeds to recommendations with suggested music direction', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];

    const mockHighAnalysis: CameraAnalysisResponse = {
      expression: 'happy-looking',
      confidence: 'HIGH',
      image_quality: 'GOOD',
      visual_observations: ['visible broad smile'],
      music_direction: 'upbeat and cheerful acoustic pop music',
    };

    render(
      <CameraModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectMusicDirection={(dir) => {
          calls.push(dir);
        }}
        analyzeImageFn={async () => mockHighAnalysis}
      />
    );

    const analyzeBtn = await screen.findByRole('button', { name: 'Analyze' });
    expect(analyzeBtn).toBeInTheDocument();

    await user.click(analyzeBtn);

    expect(calls).toEqual(['upbeat and cheerful acoustic pop music']);
    expect(screen.queryByLabelText(/select your mood/i)).not.toBeInTheDocument();
  });

  it('Scenario B (MEDIUM confidence): displays dropdown and respects user selected mood', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];

    const mockMediumAnalysis: CameraAnalysisResponse = {
      expression: 'subtle / ambiguous smile',
      confidence: 'MEDIUM',
      image_quality: 'FAIR',
      visual_observations: ['partially relaxed face'],
      music_direction: 'relaxed and balanced music',
    };

    render(
      <CameraModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectMusicDirection={(dir) => {
          calls.push(dir);
        }}
        analyzeImageFn={async () => mockMediumAnalysis}
      />
    );

    const analyzeBtn = await screen.findByRole('button', { name: 'Analyze' });
    await user.click(analyzeBtn);

    expect(calls).toHaveLength(0);

    expect(
      screen.getByText(/We're not entirely sure about your expression. What kind of music are you in the mood for?/i)
    ).toBeInTheDocument();

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '2'); // Calm / Peaceful (index 2)

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(calls).toEqual(['peaceful and calm ambient music']);
  });

  it("Scenario C (LOW confidence): displays 'Move to a better frame and try again.' and NEVER calls search", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];

    const mockLowAnalysis: CameraAnalysisResponse = {
      expression: 'uncertain',
      confidence: 'LOW',
      image_quality: 'POOR',
      visual_observations: ['underexposed frame', 'face not detected'],
      music_direction: null,
    };

    render(
      <CameraModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectMusicDirection={(dir) => {
          calls.push(dir);
        }}
        analyzeImageFn={async () => mockLowAnalysis}
      />
    );

    const analyzeBtn = await screen.findByRole('button', { name: 'Analyze' });
    await user.click(analyzeBtn);

    expect(screen.getByText('Move to a better frame and try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('Verifies camera button exists in Composer and opens modal in App', async () => {
    vi.spyOn(client, 'getStatus').mockResolvedValue({
      mode: 'live',
      interpretMode: 'live',
      gemini: { configured: true, valid: true },
      spotify: { configured: true, valid: true, authorized: true },
      missing: [],
    });

    const user = userEvent.setup();
    render(<App />);

    const cameraBtn = screen.getByRole('button', { name: 'Analyze mood with camera' });
    expect(cameraBtn).toBeInTheDocument();

    await user.click(cameraBtn);

    expect(screen.getByRole('dialog', { name: /Camera Mood Discovery/i })).toBeInTheDocument();
  });
});
