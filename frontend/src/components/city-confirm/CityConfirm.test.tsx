import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CityConfirm from './CityConfirm';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cities = [{ slug: 'ongole', name: 'Ongole' }, { slug: 'hyderabad', name: 'Hyderabad' }];
let root: Root;
let host: HTMLDivElement;

function setup() {
  const onChange = vi.fn();
  const onConfirmedChange = vi.fn();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(
    <CityConfirm cities={cities} value="hyderabad" confirmed={false} onChange={onChange} onConfirmedChange={onConfirmedChange} />,
  ));
  return {
    onChange,
    onConfirmedChange,
    select: host.querySelector('select') as HTMLSelectElement,
    tick: host.querySelector('input[type="checkbox"]') as HTMLInputElement,
  };
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('CityConfirm', () => {
  it('starts unconfirmed on the browsed city and names it', () => {
    const { select, tick } = setup();
    expect(select.value).toBe('hyderabad');
    expect(tick.checked).toBe(false);
    expect(host.textContent).toContain('Yes, this is in Hyderabad');
  });

  it('counts choosing another city as confirming it', () => {
    const { select, onChange, onConfirmedChange } = setup();
    act(() => {
      select.value = 'ongole';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('ongole');
    expect(onConfirmedChange).toHaveBeenCalledWith(true);
  });

  it('confirms with the tick box', () => {
    const { tick, onChange, onConfirmedChange } = setup();
    act(() => tick.click());
    expect(onConfirmedChange).toHaveBeenCalledWith(true);
    expect(onChange).not.toHaveBeenCalled();
  });
});
