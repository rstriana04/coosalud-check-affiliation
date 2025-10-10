import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString) {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return dateString;
  }
}

export function formatDuration(ms) {
  if (!ms || ms < 0) return '-';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('es-CO').format(num);
}

export function getStatusColor(status) {
  const colors = {
    success: 'text-green-600 bg-green-50',
    failed: 'text-red-600 bg-red-50',
    processing: 'text-blue-600 bg-blue-50',
    pending: 'text-gray-600 bg-gray-50',
    skipped: 'text-yellow-600 bg-yellow-50'
  };
  
  return colors[status] || colors.pending;
}

export function getStatusIcon(status) {
  const icons = {
    success: '✓',
    failed: '✗',
    processing: '⟳',
    pending: '○',
    skipped: '⊘'
  };
  
  return icons[status] || icons.pending;
}

export function calculatePercentage(current, total) {
  if (!total || total === 0) return 0;
  return Math.round((current / total) * 100);
}

