import * as StoreReview from 'expo-store-review';
import { storage } from './storage';

/**
 * Requests the native App Store / Play Store review dialog at a genuine
 * happy-path moment (first WhatsApp contact, first listing approval) —
 * never on launch or during onboarding, per platform guidelines. Fires at
 * most once per install: the OS itself decides whether to actually show
 * the dialog and throttles repeat requests, but there's no reason for the
 * app to keep asking its own API once it's tried.
 */
export async function maybePromptStoreReview(): Promise<void> {
  try {
    if (await storage.hasPromptedStoreReview()) return;
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;
    await storage.setPromptedStoreReview();
    await StoreReview.requestReview();
  } catch {
    // Never let a review-prompt failure affect the actual user action it's attached to.
  }
}
