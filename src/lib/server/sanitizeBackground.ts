import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const ALLOWED_PROPERTIES = new Set([
	'background',
	'background-color',
	'background-image',
	'background-position',
	'background-size',
	'background-repeat',
	'background-attachment',
	'background-origin',
	'background-clip'
]);

const DANGEROUS_PATTERNS = [
	/javascript:/i,
	/vbscript:/i,
	/expression\s*\(/i,
	/behavior\s*:/i,
	/-moz-binding/i,
	/url\s*\(\s*["']?\s*data:/i,
	/@import/i,
	/<script/i,
	/<\/script/i,
	/&#/i,
	/%[0-9a-f]{2}/i,
	/\\/
];

function decodeHTMLEntities(str: string): string {
	return str
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
		.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&amp;/gi, '&')
		.replace(/&quot;/gi, '"')
		.replace(/&apos;/gi, "'");
}

function decodeURLEncoding(str: string): string {
	try {
		return decodeURIComponent(str);
	} catch {
		return str;
	}
}

function removeEscapes(str: string): string {
	return str.replace(/\\+/g, '');
}

function isDangerous(value: string): boolean {
	const decoded = decodeHTMLEntities(decodeURLEncoding(value));
	const withoutEscapes = removeEscapes(decoded);
	const normalized = withoutEscapes.replace(/\s+/g, '').toLowerCase();

	const allVariants = [value, decoded, withoutEscapes, normalized];

	return allVariants.some((variant) =>
		DANGEROUS_PATTERNS.some((pattern) => pattern.test(variant))
	);
}

function createDOMPurify() {
	const window = new JSDOM('').window;
	return DOMPurify(window as unknown as Window);
}

export interface TextColors {
	primary: string;
	secondary: string;
	muted: string;
	border: string;
}

export interface SanitizeResult {
	css: string | null;
	blocked: boolean;
	reason?: string;
	textColors: TextColors;
}

const DEFAULT_TEXT_COLORS: TextColors = {
	primary: '#111827',
	secondary: '#374151',
	muted: '#6b7280',
	border: '#e5e7eb'
};

const LIGHT_TEXT_COLORS: TextColors = {
	primary: '#ffffff',
	secondary: '#e5e7eb',
	muted: '#d1d5db',
	border: '#4b5563'
};

function parseColor(color: string): { r: number; g: number; b: number } | null {
	const hex3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
	const hex6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
	const rgb = /^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i;

	let match = color.match(hex6);
	if (match) {
		return {
			r: parseInt(match[1], 16),
			g: parseInt(match[2], 16),
			b: parseInt(match[3], 16)
		};
	}

	match = color.match(hex3);
	if (match) {
		return {
			r: parseInt(match[1] + match[1], 16),
			g: parseInt(match[2] + match[2], 16),
			b: parseInt(match[3] + match[3], 16)
		};
	}

	match = color.match(rgb);
	if (match) {
		return {
			r: parseInt(match[1], 10),
			g: parseInt(match[2], 10),
			b: parseInt(match[3], 10)
		};
	}

	return null;
}

function getLuminance(r: number, g: number, b: number): number {
	const [rs, gs, bs] = [r, g, b].map((c) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(l1: number, l2: number): number {
	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);
	return (lighter + 0.05) / (darker + 0.05);
}

function getContrastingTextColors(bgColor: string): TextColors {
	const parsed = parseColor(bgColor.trim());
	if (!parsed) return DEFAULT_TEXT_COLORS;

	const bgLuminance = getLuminance(parsed.r, parsed.g, parsed.b);
	const whiteLuminance = getLuminance(255, 255, 255);
	const blackLuminance = getLuminance(0, 0, 0);

	const whiteContrast = getContrastRatio(bgLuminance, whiteLuminance);
	const blackContrast = getContrastRatio(bgLuminance, blackLuminance);

	return whiteContrast > blackContrast ? LIGHT_TEXT_COLORS : DEFAULT_TEXT_COLORS;
}

function extractBackgroundColor(css: string): string | null {
	const bgColorMatch = css.match(/background-color\s*:\s*([^;]+)/i);
	if (bgColorMatch) return bgColorMatch[1].trim();

	const bgMatch = css.match(/background\s*:\s*([^;]+)/i);
	if (bgMatch) {
		const value = bgMatch[1].trim();
		const colorMatch = value.match(/(#[0-9a-f]{3,6}|rgba?\s*\([^)]+\))/i);
		if (colorMatch) return colorMatch[1];
	}

	return null;
}

export function sanitizeBackgroundCSS(css: string | null | undefined): string | null {
	return sanitizeBackgroundCSSWithInfo(css).css;
}

export function sanitizeBackgroundCSSWithInfo(css: string | null | undefined): SanitizeResult {
	if (!css || typeof css !== 'string') {
		return { css: null, blocked: false, textColors: DEFAULT_TEXT_COLORS };
	}

	const trimmed = css.trim();
	if (!trimmed) {
		return { css: null, blocked: false, textColors: DEFAULT_TEXT_COLORS };
	}

	const purify = createDOMPurify();
	const purified = purify.sanitize(trimmed, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

	if (purified !== trimmed) {
		console.warn('DOMPurify modified CSS:', { original: trimmed, purified });
		return { css: null, blocked: true, reason: 'Potentially dangerous content detected', textColors: DEFAULT_TEXT_COLORS };
	}

	if (isDangerous(trimmed)) {
		console.warn('Blocked dangerous CSS:', trimmed);
		return { css: null, blocked: true, reason: 'Potentially dangerous content detected', textColors: DEFAULT_TEXT_COLORS };
	}

	const declarations = trimmed.split(';').filter(Boolean);
	const sanitized: string[] = [];

	for (const decl of declarations) {
		const colonIndex = decl.indexOf(':');
		if (colonIndex === -1) continue;

		const property = decl.slice(0, colonIndex).trim().toLowerCase();
		const value = decl.slice(colonIndex + 1).trim();

		if (!ALLOWED_PROPERTIES.has(property)) {
			continue;
		}

		if (isDangerous(value)) {
			console.warn('Blocked dangerous CSS value:', value);
			continue;
		}

		sanitized.push(`${property}: ${value}`);
	}

	const result = sanitized.length > 0 ? sanitized.join('; ') : null;

	if (result === null && trimmed.length > 0) {
		return { css: null, blocked: true, reason: 'Invalid or disallowed CSS properties', textColors: DEFAULT_TEXT_COLORS };
	}

	const bgColor = extractBackgroundColor(result || '');
	const textColors = bgColor ? getContrastingTextColors(bgColor) : DEFAULT_TEXT_COLORS;

	return { css: result, blocked: false, textColors };
}
