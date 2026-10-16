import { Link } from "react-router-dom";

export function QadamMark() {
  return (
    <svg className="qadam-mark" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M8 30h8v-8h8v-8h8" />
      <circle cx="32" cy="14" r="2.25" />
    </svg>
  );
}

export function Brand({ to }: { to: string }) {
  return (
    <Link className="brand qadam-brand" to={to} aria-label="Qadam Business">
      <QadamMark />
      <span className="qadam-wordmark">
        qadam<span>business</span>
      </span>
    </Link>
  );
}
