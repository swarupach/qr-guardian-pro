export type RiskLevel = "safe" | "suspicious" | "dangerous";

export type QrType =
  | "url"
  | "email"
  | "phone"
  | "sms"
  | "whatsapp"
  | "wifi"
  | "upi"
  | "crypto"
  | "vcard"
  | "appstore"
  | "deeplink"
  | "text";

export interface DecodedData {
  type: QrType;
  raw: string;
  url?: string;
  domain?: string;
  https?: boolean;
  fields?: Record<string, string>;
}

export interface AnalysisResult {
  score: number; // 0–100
  level: RiskLevel;
  reasons: { label: string; severity: "info" | "warn" | "danger" }[];
  explanation: string;
  decoded: DecodedData;
}

const SHORTENERS = [
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
  "adf.ly", "rebrand.ly", "cutt.ly", "shorturl.at", "rb.gy", "tiny.cc",
];

const SUSPICIOUS_TLDS = [".zip", ".xyz", ".top", ".tk", ".ml", ".ga", ".cf", ".gq", ".click", ".country", ".kim", ".work"];

const PHISH_KEYWORDS = [
  "login", "signin", "verify", "secure", "account", "update", "confirm",
  "wallet", "bank", "password", "support", "unlock", "billing", "invoice",
  "gift", "prize", "winner", "bonus", "free",
];

const DANGEROUS_EXTENSIONS = [".exe", ".apk", ".scr", ".bat", ".cmd", ".dll", ".vbs", ".jar", ".msi", ".ps1"];

const BRAND_NAMES = ["paypal", "google", "apple", "microsoft", "amazon", "facebook", "instagram", "netflix", "binance", "coinbase", "metamask", "whatsapp"];

function decode(content: string): DecodedData {
  const t = content.trim();
  const lower = t.toLowerCase();

  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    try {
      const u = new URL(t);
      return { type: "url", raw: t, url: t, domain: u.hostname, https: u.protocol === "https:" };
    } catch {
      return { type: "url", raw: t, url: t };
    }
  }
  if (lower.startsWith("mailto:")) return { type: "email", raw: t, fields: { email: t.slice(7) } };
  if (lower.startsWith("tel:")) return { type: "phone", raw: t, fields: { phone: t.slice(4) } };
  if (lower.startsWith("smsto:") || lower.startsWith("sms:")) return { type: "sms", raw: t };
  if (lower.includes("wa.me") || lower.startsWith("whatsapp://")) return { type: "whatsapp", raw: t };
  if (lower.startsWith("wifi:")) {
    const fields: Record<string, string> = {};
    t.slice(5).split(";").forEach((p) => {
      const [k, v] = p.split(":");
      if (k && v) fields[k] = v;
    });
    return { type: "wifi", raw: t, fields };
  }
  if (lower.startsWith("upi://")) return { type: "upi", raw: t };
  if (lower.startsWith("bitcoin:") || lower.startsWith("ethereum:") || lower.startsWith("litecoin:")) return { type: "crypto", raw: t };
  if (lower.startsWith("begin:vcard")) return { type: "vcard", raw: t };
  if (lower.includes("apps.apple.com") || lower.includes("play.google.com")) return { type: "appstore", raw: t, url: t };
  if (t.includes("://") && !lower.startsWith("http")) return { type: "deeplink", raw: t };
  return { type: "text", raw: t };
}

function isIpHost(host: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^\[?[a-fA-F0-9:]+\]?$/.test(host) && host.includes(":");
}

function hasUnicodeSpoofing(host: string) {
  // non-ASCII chars in hostname (potential homograph)
  return /[^\x00-\x7F]/.test(host) || host.startsWith("xn--");
}

function looksObfuscated(url: string) {
  return url.includes("%2F%2F") || url.split("%").length > 4 || /\\x[0-9a-f]{2}/i.test(url);
}

export function analyzeQr(content: string): AnalysisResult {
  const decoded = decode(content);
  const reasons: AnalysisResult["reasons"] = [];
  let score = 100;

  if (decoded.type === "url" && decoded.url) {
    const url = decoded.url;
    const host = (decoded.domain || "").toLowerCase();

    if (decoded.https === false) {
      reasons.push({ label: "Uses insecure HTTP connection (no SSL)", severity: "danger" });
      score -= 25;
    } else {
      reasons.push({ label: "Uses secure HTTPS connection", severity: "info" });
    }

    if (host && SHORTENERS.some((s) => host === s || host.endsWith("." + s))) {
      reasons.push({ label: "URL shortener detected — final destination is hidden", severity: "warn" });
      score -= 20;
    }

    if (host && isIpHost(host)) {
      reasons.push({ label: "URL uses a raw IP address instead of a domain", severity: "danger" });
      score -= 30;
    }

    if (host && SUSPICIOUS_TLDS.some((tld) => host.endsWith(tld))) {
      reasons.push({ label: `Suspicious top-level domain (${host.split(".").pop()})`, severity: "warn" });
      score -= 15;
    }

    if (host && hasUnicodeSpoofing(host)) {
      reasons.push({ label: "Possible homograph / unicode spoofing in domain", severity: "danger" });
      score -= 25;
    }

    if (looksObfuscated(url)) {
      reasons.push({ label: "URL appears obfuscated with heavy encoding", severity: "warn" });
      score -= 15;
    }

    const lowUrl = url.toLowerCase();
    const matchedPhish = PHISH_KEYWORDS.filter((k) => lowUrl.includes(k));
    if (matchedPhish.length > 0) {
      reasons.push({ label: `Phishing keyword(s) in URL: ${matchedPhish.slice(0, 3).join(", ")}`, severity: "warn" });
      score -= Math.min(20, matchedPhish.length * 8);
    }

    const brandImpersonation = BRAND_NAMES.find((b) => host && host.includes(b) && !host.endsWith(`${b}.com`));
    if (brandImpersonation) {
      reasons.push({ label: `Possible brand impersonation: contains "${brandImpersonation}"`, severity: "danger" });
      score -= 25;
    }

    if (DANGEROUS_EXTENSIONS.some((e) => lowUrl.endsWith(e))) {
      reasons.push({ label: "URL points to an executable / installer file", severity: "danger" });
      score -= 35;
    }

    if (host && host.split(".").length > 4) {
      reasons.push({ label: "Excessive subdomain depth", severity: "warn" });
      score -= 8;
    }

    if (url.length > 200) {
      reasons.push({ label: "Unusually long URL", severity: "warn" });
      score -= 5;
    }
  } else if (decoded.type === "wifi") {
    reasons.push({ label: "WiFi credentials — only connect to networks you trust", severity: "warn" });
    score -= 10;
  } else if (decoded.type === "crypto") {
    reasons.push({ label: "Cryptocurrency address — verify the recipient carefully", severity: "warn" });
    score -= 15;
  } else if (decoded.type === "upi") {
    reasons.push({ label: "Payment request — confirm the amount before approving", severity: "warn" });
    score -= 10;
  } else if (decoded.type === "deeplink") {
    reasons.push({ label: "Custom app deep link — opens an external application", severity: "warn" });
    score -= 10;
  } else if (decoded.type === "text") {
    reasons.push({ label: "Plain text content — no executable action", severity: "info" });
  } else {
    reasons.push({ label: `Contains ${decoded.type} information`, severity: "info" });
  }

  score = Math.max(0, Math.min(100, score));
  const level: RiskLevel = score >= 75 ? "safe" : score >= 45 ? "suspicious" : "dangerous";

  const explanation = buildExplanation(decoded, level, score, reasons);

  return { score, level, reasons, explanation, decoded };
}

function buildExplanation(
  decoded: DecodedData,
  level: RiskLevel,
  score: number,
  reasons: AnalysisResult["reasons"],
): string {
  const negatives = reasons.filter((r) => r.severity !== "info");
  if (level === "safe") {
    return `This QR code (${decoded.type.toUpperCase()}) scored ${score}/100. No major phishing, malware, or suspicious indicators were detected${decoded.https ? " and the destination uses a secure HTTPS connection" : ""}. It appears safe to continue.`;
  }
  if (level === "suspicious") {
    return `This QR code scored ${score}/100. We found ${negatives.length} potential warning${negatives.length === 1 ? "" : "s"}: ${negatives.map((r) => r.label.toLowerCase()).join("; ")}. Proceed only if you trust the source.`;
  }
  return `This QR code scored ${score}/100 and is flagged as dangerous. ${negatives.length} serious risk${negatives.length === 1 ? "" : "s"} were detected: ${negatives.map((r) => r.label.toLowerCase()).join("; ")}. We strongly recommend NOT opening this link.`;
}