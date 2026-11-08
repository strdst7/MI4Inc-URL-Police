import Link from "next/link";

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M5.5 26V10.5L12 19.3L18.5 10.5V26"
          stroke="currentColor"
          strokeWidth="3.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M23 10.5V20.5H32M27.5 15.5H32V26"
          stroke="currentColor"
          strokeWidth="3.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="29.5" cy="8" r="2.1" fill="#C9EB67" />
      </svg>
    </span>
  );
}

export function Brand({
  inverse = false,
  compact = false,
  link = true,
}: {
  inverse?: boolean;
  compact?: boolean;
  link?: boolean;
}) {
  const content = (
    <>
      <BrandMark />
      <span className="brand-text">
        <span className="brand-name">MI4, Inc</span>
        <span className="brand-sub">aimirah-systems · Signal</span>
      </span>
    </>
  );
  const className = `brand${inverse ? " inverse" : ""}${compact ? " brand-compact" : ""}`;
  return link ? (
    <Link href="/" className={className} aria-label="MI4, Inc aimirah-systems home">
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  );
}
