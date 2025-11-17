import { beforeEach, afterEach, vi } from 'vitest';

// Silence console output during tests to keep test output clean.
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  // Restore mocks so other suites or code can re-spy if needed
  try { (console.log as any).mockRestore(); } catch {};
  try { (console.error as any).mockRestore(); } catch {};
  try { (console.warn as any).mockRestore(); } catch {};
});
