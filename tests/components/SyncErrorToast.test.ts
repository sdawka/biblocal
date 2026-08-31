import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SyncErrorToast from '../../src/components/SyncErrorToast.svelte';
import { syncError, reportSyncError, clearSyncError } from '../../src/stores/sync-status';

// Mock i18n
vi.mock('../../src/i18n', () => ({
  useTranslations: (lang: string) => ({
    common: {
      dismiss: 'Dismiss',
      syncError:
        lang === 'es'
          ? 'No se pudo guardar el cambio. Inténtalo de nuevo.'
          : 'Could not save your change. Please try again.',
    },
  }),
}));

describe('SyncErrorToast', () => {
  beforeEach(() => {
    syncError.set(null);
  });

  describe('Visibility', () => {
    it('renders nothing when no sync error is set', () => {
      const { container } = render(SyncErrorToast, { props: { lang: 'en' } });

      const toast = container.querySelector('.sync-toast');
      expect(toast).toBeNull();
    });

    it('renders toast when syncError is set', () => {
      syncError.set('Could not save your change. Please try again.');
      const { container } = render(SyncErrorToast, { props: { lang: 'en' } });

      const toast = container.querySelector('.sync-toast');
      expect(toast).toBeTruthy();
    });

    it('renders a safe localized error message instead of raw failure details', () => {
      const errorMessage = 'Network error: connection failed';
      syncError.set(errorMessage);
      render(SyncErrorToast, { props: { lang: 'en' } });

      expect(screen.getByText('Could not save your change. Please try again.')).toBeTruthy();
      expect(screen.queryByText(errorMessage)).toBeNull();
    });

    it('toast has correct CSS classes', () => {
      syncError.set('Error message');
      const { container } = render(SyncErrorToast, { props: { lang: 'en' } });

      const toast = container.querySelector('.sync-toast');
      expect(toast?.classList.contains('sync-toast')).toBe(true);
      expect(toast?.classList.contains('rise')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('toast has role="alert"', () => {
      syncError.set('Error message');
      const { container } = render(SyncErrorToast, { props: { lang: 'en' } });

      const toast = container.querySelector('.sync-toast');
      expect(toast?.getAttribute('role')).toBe('alert');
    });

    it('close button has aria-label', () => {
      syncError.set('Error message');
      const { container } = render(SyncErrorToast, { props: { lang: 'en' } });

      const closeButton = container.querySelector('.sync-toast-close');
      expect(closeButton?.getAttribute('aria-label')).toBe('Dismiss');
    });

    it('close button SVG is aria-hidden', () => {
      syncError.set('Error message');
      const { container } = render(SyncErrorToast, { props: { lang: 'en' } });

      const svg = container.querySelector('.sync-toast-close svg');
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Dismiss interaction', () => {
    it('clicking close button hides the toast', () => {
      syncError.set('Error message');
      const { container } = render(SyncErrorToast, { props: { lang: 'en' } });

      expect(container.querySelector('.sync-toast')).toBeTruthy();

      const closeButton = container.querySelector('.sync-toast-close');
      fireEvent.click(closeButton!);

      expect(container.querySelector('.sync-toast')).toBeNull();
    });

    it('clicking close button calls clearSyncError', () => {
      syncError.set('Error message');
      const { container } = render(SyncErrorToast, { props: { lang: 'en' } });

      expect(syncError.get()).toBe('Error message');

      const closeButton = container.querySelector('.sync-toast-close');
      fireEvent.click(closeButton!);

      expect(syncError.get()).toBeNull();
    });

    it('close button is clickable', () => {
      syncError.set('Error message');
      const { container } = render(SyncErrorToast, { props: { lang: 'en' } });

      const closeButton = container.querySelector('.sync-toast-close');
      expect(closeButton?.tagName).toBe('BUTTON');
      expect(closeButton?.getAttribute('type')).toBe('button');
    });
  });

  describe('Error message updates', () => {
    it('displays different error messages when pre-set before render', () => {
      syncError.set('First error');
      const { rerender } = render(SyncErrorToast, { props: { lang: 'en' } });

      expect(screen.getByText('Could not save your change. Please try again.')).toBeTruthy();

      // Re-render with new store value
      syncError.set('Second error');
      rerender(SyncErrorToast, { props: { lang: 'en' } });
      expect(screen.getByText('Could not save your change. Please try again.')).toBeTruthy();
    });

    it('shows new error after dismissing previous one', () => {
      syncError.set('First error');
      const { container } = render(SyncErrorToast, { props: { lang: 'en' } });

      const closeButton = container.querySelector('.sync-toast-close');
      fireEvent.click(closeButton!);

      expect(container.querySelector('.sync-toast')).toBeNull();
      expect(syncError.get()).toBeNull();
    });
  });

  describe('Store integration', () => {
    it('clearSyncError function works', () => {
      syncError.set('Error');
      expect(syncError.get()).toBe('Error');

      clearSyncError();
      expect(syncError.get()).toBeNull();
    });

    it('reportSyncError function updates store', () => {
      reportSyncError('Test error');
      expect(syncError.get()).toBe('Test error');
    });

    it('toast shows error set in store before render', () => {
      const error = 'Test error message';
      syncError.set(error);
      const { container } = render(SyncErrorToast, { props: { lang: 'en' } });

      expect(container.querySelector('.sync-toast')).toBeTruthy();
      expect(screen.getByText('Could not save your change. Please try again.')).toBeTruthy();
      expect(screen.queryByText(error)).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('handles empty error message gracefully', () => {
      syncError.set('');
      const { container } = render(SyncErrorToast, { props: { lang: 'en' } });

      // Toast should not render for empty string (falsy)
      const toast = container.querySelector('.sync-toast');
      expect(toast).toBeNull();
    });

    it('handles very long error messages', () => {
      const longError = 'A'.repeat(500);
      syncError.set(longError);
      render(SyncErrorToast, { props: { lang: 'en' } });

      expect(screen.getByText('Could not save your change. Please try again.')).toBeTruthy();
      expect(screen.queryByText(longError)).toBeNull();
    });

    it('handles special characters in error message', () => {
      const specialError = 'Error: <script>alert("XSS")</script> & symbols ñ é';
      syncError.set(specialError);
      render(SyncErrorToast, { props: { lang: 'en' } });

      expect(screen.getByText('Could not save your change. Please try again.')).toBeTruthy();
      expect(screen.queryByText(specialError)).toBeNull();
    });

    it('handles null error (no toast)', () => {
      syncError.set(null);
      const { container } = render(SyncErrorToast, { props: { lang: 'en' } });

      const toast = container.querySelector('.sync-toast');
      expect(toast).toBeNull();
    });
  });

  describe('Language prop', () => {
    it('accepts lang prop', () => {
      syncError.set('Erreur');
      const { container } = render(SyncErrorToast, { props: { lang: 'fr' } });

      const toast = container.querySelector('.sync-toast');
      expect(toast).toBeTruthy();
    });

    it('defaults to en when lang not provided', () => {
      syncError.set('Error');
      const { container } = render(SyncErrorToast);

      const toast = container.querySelector('.sync-toast');
      expect(toast).toBeTruthy();
    });

    it('replaces raw English failure details with a localized message', () => {
      syncError.set('Network error');
      render(SyncErrorToast, { props: { lang: 'es' } });

      expect(screen.getByText('No se pudo guardar el cambio. Inténtalo de nuevo.')).toBeTruthy();
      expect(screen.queryByText('Network error')).toBeNull();
    });
  });
});
