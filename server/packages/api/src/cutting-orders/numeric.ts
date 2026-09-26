export function numericColumn(name: string, precision: number, scale: number, nullable = false) {
  return {
    name,
    type: "numeric" as const,
    precision,
    scale,
    nullable,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value == null ? null : Number(value)),
    },
  };
}
