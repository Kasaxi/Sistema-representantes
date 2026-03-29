export type StockStatus = 'ok' | 'low' | 'high' | 'unconfigured';

/**
 * Determines stock health based on configured limits.
 * - unconfigured: min=0 AND max=0 (never set)
 * - low:  current < min
 * - high: current > max
 * - ok:   everything else
 */
export function getStockStatus(
  atual: number,
  minimo: number,
  maximo: number
): StockStatus {
  if (minimo === 0 && maximo === 0) return 'unconfigured';
  if (atual < minimo) return 'low';
  if (maximo > 0 && atual > maximo) return 'high';
  return 'ok';
}

interface StockStatusStyle {
  bgClass: string;
  textClass: string;
  icon: string;
  label: string;
}

const STATUS_STYLES: Record<StockStatus, StockStatusStyle> = {
  ok: {
    bgClass: 'bg-[var(--status-ok-bg)]',
    textClass: 'text-[var(--status-ok-text)]',
    icon: '✓',
    label: '',
  },
  low: {
    bgClass: 'bg-[var(--status-low-bg)]',
    textClass: 'text-[var(--status-low-text)]',
    icon: '⚠',
    label: 'Reposição necessária',
  },
  high: {
    bgClass: 'bg-[var(--status-high-bg)]',
    textClass: 'text-[var(--status-high-text)]',
    icon: '↑',
    label: 'Acima do limite',
  },
  unconfigured: {
    bgClass: 'bg-[var(--status-none-bg)]',
    textClass: 'text-[var(--status-none-text)]',
    icon: '',
    label: 'Limite não definido',
  },
};

export function getStockStatusStyle(status: StockStatus): StockStatusStyle {
  return STATUS_STYLES[status];
}

/**
 * Markup semaphore for product tables.
 * >= 150% → green, 50-149% → amber, < 50% → red
 */
export function getMarkupColor(markup: number): string {
  if (markup >= 150) return 'text-[var(--markup-good-text)]';
  if (markup >= 50) return 'text-[var(--markup-mid-text)]';
  return 'text-[var(--markup-bad-text)]';
}
