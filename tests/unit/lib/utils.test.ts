import { describe, it, expect } from '@jest/globals';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('should return a single class name unchanged', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('should merge multiple class names into one string', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should omit falsy values', () => {
    expect(cn('foo', false && 'bar', null, undefined, 'baz')).toBe('foo baz');
  });

  it('should support conditional object syntax', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('should resolve Tailwind conflicts — last class wins', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('should resolve Tailwind conflicts with mixed input types', () => {
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('should handle array inputs', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('should return empty string when given no arguments', () => {
    expect(cn()).toBe('');
  });
});
