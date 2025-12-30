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
	/\\00/i,
	/\\u00/i,
	/&#/i,
	/%[0-9a-f]{2}/i
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

function isDangerous(value: string): boolean {
	const decoded = decodeHTMLEntities(decodeURLEncoding(value));
	const normalized = decoded.replace(/\s+/g, '').toLowerCase();

	return (
		DANGEROUS_PATTERNS.some((pattern) => pattern.test(value)) ||
		DANGEROUS_PATTERNS.some((pattern) => pattern.test(decoded)) ||
		DANGEROUS_PATTERNS.some((pattern) => pattern.test(normalized))
	);
}

function createDOMPurify() {
	const window = new JSDOM('').window;
	return DOMPurify(window as unknown as Window);
}

export interface SanitizeResult {
	css: string | null;
	blocked: boolean;
	reason?: string;
}

export function sanitizeBackgroundCSS(css: string | null | undefined): string | null {
	return sanitizeBackgroundCSSWithInfo(css).css;
}

export function sanitizeBackgroundCSSWithInfo(css: string | null | undefined): SanitizeResult {
	if (!css || typeof css !== 'string') {
		return { css: null, blocked: false };
	}

	const trimmed = css.trim();
	if (!trimmed) {
		return { css: null, blocked: false };
	}

	const purify = createDOMPurify();
	const purified = purify.sanitize(trimmed, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

	if (purified !== trimmed) {
		console.warn('DOMPurify modified CSS:', { original: trimmed, purified });
		return { css: null, blocked: true, reason: 'Potentially dangerous content detected' };
	}

	if (isDangerous(trimmed)) {
		console.warn('Blocked dangerous CSS:', trimmed);
		return { css: null, blocked: true, reason: 'Potentially dangerous content detected' };
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
		return { css: null, blocked: true, reason: 'Invalid or disallowed CSS properties' };
	}

	return { css: result, blocked: false };
}
