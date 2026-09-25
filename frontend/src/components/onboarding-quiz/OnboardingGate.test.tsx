import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardingGate from './OnboardingGate';

const render = (el: React.ReactElement) => act(() => { createRoot(document.createElement('div')).render(el); });

// The quiz must not pop over a business page, where an owner may be mid-claim.
describe('OnboardingGate', () => {
  const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(null) }));

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 't');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
  });

  it('skips business pages', () => {
    window.history.pushState({}, '', '/hyderabad/businesses/abc');
    render(<OnboardingGate />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still checks elsewhere', () => {
    window.history.pushState({}, '', '/hyderabad');
    render(<OnboardingGate />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
