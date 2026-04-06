import { describe, it, expect } from 'vitest';
import { generateId, generateSlug } from '../id';

describe('generateId', () => {
  it('returns a string of default length 21', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id).toHaveLength(21);
  });

  it('returns a string of custom length', () => {
    const id = generateId(12);
    expect(id).toHaveLength(12);
  });

  it('returns a string of length 6', () => {
    const id = generateId(6);
    expect(id).toHaveLength(6);
  });

  it('generates URL-safe characters only', () => {
    const id = generateId();
    // nanoid default alphabet: A-Za-z0-9_-
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates 1000 unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(1000);
  });
});

describe('generateSlug', () => {
  it('converts a name to a lowercase hyphenated slug with suffix', () => {
    const slug = generateSlug('My Workspace');
    expect(slug).toMatch(/^my-workspace-[A-Za-z0-9_-]{6}$/);
  });

  it('strips special characters', () => {
    const slug = generateSlug('Hello World!');
    expect(slug).toMatch(/^hello-world-[A-Za-z0-9_-]{6}$/);
  });

  it('collapses multiple spaces and hyphens', () => {
    const slug = generateSlug('Too   Many   Spaces');
    expect(slug).toMatch(/^too-many-spaces-[A-Za-z0-9_-]{6}$/);
  });

  it('trims leading and trailing whitespace', () => {
    const slug = generateSlug('  padded name  ');
    expect(slug).toMatch(/^padded-name-[A-Za-z0-9_-]{6}$/);
  });

  it('handles underscores by converting to hyphens', () => {
    const slug = generateSlug('my_workspace_name');
    expect(slug).toMatch(/^my-workspace-name-[A-Za-z0-9_-]{6}$/);
  });

  it('generates unique slugs for the same input', () => {
    const slug1 = generateSlug('Test');
    const slug2 = generateSlug('Test');
    // The base is the same but suffixes differ
    expect(slug1).not.toBe(slug2);
    expect(slug1.startsWith('test-')).toBe(true);
    expect(slug2.startsWith('test-')).toBe(true);
  });

  it('produces URL-safe output', () => {
    const slug = generateSlug('Café & Restaurant #1');
    // Should not contain &, # or spaces; nanoid suffix may have mixed case
    expect(slug).not.toContain('&');
    expect(slug).not.toContain('#');
    expect(slug).not.toContain(' ');
    // Base part should be lowercase, suffix is nanoid (alphanumeric + hyphens)
    expect(slug).toMatch(/^[a-z0-9-]+-[A-Za-z0-9_-]{6}$/);
  });

  it('handles single word input', () => {
    const slug = generateSlug('Budget');
    expect(slug).toMatch(/^budget-[A-Za-z0-9_-]{6}$/);
  });
});
