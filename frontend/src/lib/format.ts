const eur = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });

export const money = (cents: number): string => eur.format(cents / 100);
export const date = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
