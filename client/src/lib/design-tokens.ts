export const semanticColors = {
  primary: "primary",
  secondary: "secondary",
  success: "success",
  warning: "warning",
  destructive: "destructive",
  background: "background",
  surface: "surface",
  foreground: "foreground",
  mutedForeground: "muted-foreground",
} as const;

export const spacingScale = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "8",
  "10",
  "12",
] as const;

export const headingScale = {
  h1: "text-3xl font-semibold tracking-tight",
  h2: "text-2xl font-semibold tracking-tight",
  h3: "text-xl font-semibold",
  h4: "text-lg font-semibold",
} as const;

export const bodyScale = {
  lg: "text-lg leading-7",
  md: "text-base leading-6",
  sm: "text-sm leading-5",
} as const;

export type SemanticColor = keyof typeof semanticColors;
