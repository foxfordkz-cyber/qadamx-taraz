const paths = {
  menu: "M4 6h16M4 12h16M4 18h16",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  shop: "M3 9h18l-2-6H5L3 9Zm1 0v12h16V9M9 21v-7h6v7M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0",
  home: "M3 10 12 3l9 7v10H3V10Zm6 10v-7h6v7",
  sale: "M12 5v14M5 12h14",
  debts: "M4 5h16v15H4V5Zm4-2v4m8-4v4M8 12h8m-8 4h5",
  inquiries: "M4 4h16v12H9l-5 5V4Zm4 4h8m-8 4h5",
  summary: "M4 20h17M7 16V9m5 7V4m5 12v-5",
  customers:
    "M16 21v-3a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v3M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 4a3 3 0 0 1 0 6m4 11v-3a4 4 0 0 0-3-4",
  catalog: "m3 7 9-4 9 4-9 4-9-4Zm0 0v10l9 4 9-4V7M12 11v10",
  history: "M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2",
  arrow: "M5 12h14m-6-6 6 6-6 6",
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
