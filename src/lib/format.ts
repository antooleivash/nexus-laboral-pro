export const formatCLP = (value: number | null | undefined) => {
  const n = typeof value === "number" ? value : 0;
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
};

export const formatNumber = (value: number | null | undefined) =>
  new Intl.NumberFormat("es-CL").format(typeof value === "number" ? value : 0);

export const minutesBetween = (shift: string, actual: string) => {
  // shift / actual as "HH:MM" or "HH:MM:SS"
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  return Math.max(0, toMin(actual) - toMin(shift));
};
