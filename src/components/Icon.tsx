const PATHS = {
  merge: "M4 4h7v9H4zM13 11h7v9h-7zM11 8.5h4.5V11",
  split: "M4 4h16v16H4zM12 4v16M8 9l-2 3 2 3M16 9l2 3-2 3",
  organize: "M4 4h6v7H4zM14 4h6v7h-6zM4 15h6v5H4zM14 15h6v5h-6z",
  images: "M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15 9.5a1.5 1.5 0 1 0 0-.01",
  numbers: "M6 3h12v18H6zM10 17h4M12 17v-4l-1.5 1",
  metadata: "M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h3",
  password: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5zM12 15v2",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  left: "M19 12H5M11 6l-6 6 6 6",
  right: "M5 12h14M13 6l6 6-6 6",
  close: "M6 6l12 12M18 6L6 18",
  rotateLeft: "M4 4v6h6M4.5 10A8 8 0 1 1 6 17.5",
  rotateRight: "M20 4v6h-6M19.5 10A8 8 0 1 0 18 17.5",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  restore: "M4 12a8 8 0 1 0 3-6.2M4 4v4h4",
  shield: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z M9 12l2 2 4-4",
  download: "M12 4v12M7 11l5 5 5-5M5 20h14",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "grip" ? 3 : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
