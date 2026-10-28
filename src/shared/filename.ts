const RESERVED_FILENAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function sanitizeFilename(value: string, fallback = '未命名网页'): string {
  const sanitized = value
    .normalize('NFC')
    .replace(RESERVED_FILENAME_CHARACTERS, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, 120)
    .trim();

  return sanitized || fallback;
}
