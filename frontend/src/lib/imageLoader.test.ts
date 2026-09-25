import { describe, expect, it } from 'vitest';
import imageLoader from './imageLoader';

describe('imageLoader', () => {
  it('asks Cloudinary for a resized, auto-format copy', () => {
    expect(imageLoader({ src: 'https://res.cloudinary.com/x/image/upload/v17/localindia/a.jpg', width: 640 }))
      .toBe('https://res.cloudinary.com/x/image/upload/f_auto,q_auto,c_limit,w_640/v17/localindia/a.jpg');
  });
  it('leaves our own images alone', () => {
    expect(imageLoader({ src: '/category-covers/v/dental-2.jpg', width: 64 })).toBe('/category-covers/v/dental-2.jpg');
  });
});
