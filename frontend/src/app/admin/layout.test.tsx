import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminLayout from './layout';

// The admin panel must render only after the backend confirms an admin session.
// A forged `localStorage.user = {role:'admin'}` with no valid token must NOT
// show the panel — this is the hole the fix closes.

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/admin',
}));

const getMe = vi.fn();
vi.mock('@/lib/api', () => ({ api: { auth: { getMe: (t: string) => getMe(t) } } }));

async function renderAdmin() {
  const el = document.createElement('div');
  await act(async () => {
    createRoot(el).render(<AdminLayout><div data-testid="secret">admin content</div></AdminLayout>);
  });
  // let the getMe promise and its .then/.catch settle
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return el;
}

afterEach(() => { replace.mockClear(); getMe.mockClear(); localStorage.clear(); });

describe('AdminLayout session gate', () => {
  it('forged role with no token → redirects, never renders admin content', async () => {
    localStorage.setItem('user', JSON.stringify({ role: 'admin' }));   // forged, no access_token
    const el = await renderAdmin();
    expect(getMe).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/admin/login');
    expect(el.querySelector('[data-testid="secret"]')).toBeNull();
  });

  it('token present but backend rejects it → clears storage, redirects, no content', async () => {
    localStorage.setItem('access_token', 'bad');
    localStorage.setItem('user', JSON.stringify({ role: 'admin' }));
    getMe.mockRejectedValue(new Error('401'));
    const el = await renderAdmin();
    expect(getMe).toHaveBeenCalledWith('bad');
    expect(replace).toHaveBeenCalledWith('/admin/login');
    expect(localStorage.getItem('user')).toBeNull();
    expect(el.querySelector('[data-testid="secret"]')).toBeNull();
  });

  it('backend confirms a non-admin → redirects, no content', async () => {
    localStorage.setItem('access_token', 'good');
    getMe.mockResolvedValue({ id: '1', role: 'user', name: 'Reg' });
    const el = await renderAdmin();
    expect(replace).toHaveBeenCalledWith('/admin/login');
    expect(el.querySelector('[data-testid="secret"]')).toBeNull();
  });

  it('backend confirms an admin → renders the panel', async () => {
    localStorage.setItem('access_token', 'good');
    getMe.mockResolvedValue({ id: '1', role: 'admin', name: 'Boss' });
    const el = await renderAdmin();
    expect(replace).not.toHaveBeenCalled();
    expect(el.querySelector('[data-testid="secret"]')).not.toBeNull();
  });
});
