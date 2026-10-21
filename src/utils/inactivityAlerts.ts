import { ReadingMaterial } from '../types';

export interface InactivityAlertItem {
  material: ReadingMaterial;
  daysInactive: number;
  hoursInactive: number;
  urgency: 'critical' | 'warning' | 'notice';
  reasonText: string;
}

export const DEFAULT_INACTIVITY_THRESHOLD_DAYS = 5;

/**
 * Calculates how many days have passed since the material was last updated or created.
 */
export function calculateDaysInactive(updatedAt: string, createdAt?: string): { days: number; hours: number } {
  const dateStr = updatedAt || createdAt || new Date().toISOString();
  const timestamp = new Date(dateStr).getTime();
  const now = Date.now();
  
  if (isNaN(timestamp)) {
    return { days: 0, hours: 0 };
  }

  const diffMs = Math.max(0, now - timestamp);
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  return { days, hours };
}

/**
 * Returns materials marked as 'to_read' or 'under_review' that have exceeded the inactivity threshold.
 */
export function getInactiveMaterials(
  materials: ReadingMaterial[],
  thresholdDays: number = DEFAULT_INACTIVITY_THRESHOLD_DAYS
): InactivityAlertItem[] {
  const alerts: InactivityAlertItem[] = [];

  for (const material of materials) {
    if (material.status !== 'to_read' && material.status !== 'under_review') {
      continue;
    }

    const { days, hours } = calculateDaysInactive(material.updatedAt, material.createdAt);

    if (days >= thresholdDays) {
      let urgency: 'critical' | 'warning' | 'notice' = 'notice';
      if (days >= thresholdDays * 2) {
        urgency = 'critical';
      } else if (days >= thresholdDays) {
        urgency = 'warning';
      }

      const reasonText =
        material.status === 'under_review'
          ? `Marked as "Under Review" — inactive for ${days} ${days === 1 ? 'day' : 'days'}`
          : `Marked as "To Read" — unread for ${days} ${days === 1 ? 'day' : 'days'}`;

      alerts.push({
        material,
        daysInactive: days,
        hoursInactive: hours,
        urgency,
        reasonText,
      });
    }
  }

  // Sort by most inactive first
  return alerts.sort((a, b) => b.daysInactive - a.daysInactive);
}

/**
 * Human-friendly relative time formatter.
 */
export function formatInactiveTime(days: number, hours: number): string {
  if (days === 0) {
    if (hours === 0) return 'Just now';
    return `${hours}h ago`;
  }
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? 'month' : 'months'} ago`;
}

/**
 * Trigger HTML5 browser notification if permitted.
 */
export async function sendDesktopAlert(title: string, body: string): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }

  try {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
      return true;
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
        return true;
      }
    }
  } catch (err) {
    console.warn('Desktop notification failed:', err);
  }

  return false;
}
