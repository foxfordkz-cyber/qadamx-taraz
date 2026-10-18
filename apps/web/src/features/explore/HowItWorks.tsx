import type { ReactNode } from "react";
import { useT, type Key } from "./i18n";

/** The seller flow in three steps under the hero: what Qadam does, nothing more.
    No numbers or promises beyond the flow the cabinet already has. */
const STEPS: { title: Key; text: Key; icon: ReactNode }[] = [
  {
    title: "step_say",
    text: "step_say_text",
    icon: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </>
    ),
  },
  {
    title: "step_check",
    text: "step_check_text",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12.5 2.7 2.7L16.5 9.5" />
      </>
    ),
  },
  {
    title: "step_debt",
    text: "step_debt_text",
    icon: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2.5" />
        <path d="M8 8h8M8 12h8M8 16h4" />
      </>
    ),
  },
];

export function HowItWorks() {
  const { t } = useT();
  return (
    <section className="how" aria-labelledby="how-h">
      <h2 id="how-h" className="how-title">
        {t("how_title")}
      </h2>
      <ol className="how-steps">
        {STEPS.map((step) => (
          <li key={step.title}>
            <span className="how-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">{step.icon}</svg>
            </span>
            <h3>{t(step.title)}</h3>
            <p>{t(step.text)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
