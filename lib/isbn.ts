/** Normaliza e gera variantes ISBN a partir de código de barras escaneado. */

export function normalizeIsbnDigits(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, '').toUpperCase()
}

function isbn13ToIsbn10(isbn13: string): string | null {
  if (isbn13.length !== 13 || !isbn13.startsWith('978')) {
    return null
  }

  const core = isbn13.slice(3, 12)
  if (!/^\d{9}$/.test(core)) {
    return null
  }

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(core[i], 10) * (10 - i)
  }

  const check = (11 - (sum % 11)) % 11
  const checkChar = check === 10 ? 'X' : String(check)
  return core + checkChar
}

function isbn10ToIsbn13(isbn10: string): string | null {
  if (isbn10.length !== 10) {
    return null
  }

  const core9 = isbn10.slice(0, 9)
  if (!/^\d{9}$/.test(core9)) {
    return null
  }

  const base = `978${core9}`
  let sum = 0

  for (let i = 0; i < 12; i++) {
    sum += parseInt(base[i], 10) * (i % 2 === 0 ? 1 : 3)
  }

  const check = (10 - (sum % 10)) % 10
  return base + check
}

/**
 * Gera todas as variantes ISBN úteis para consulta nas APIs.
 * Códigos EAN-13 de livros começam com 978 ou 979.
 */
export function getIsbnCandidates(raw: string): string[] {
  let clean = normalizeIsbnDigits(raw)

  if (!clean) {
    return []
  }

  // GTIN-14 com zero à esquerda → EAN-13
  if (clean.length === 14 && clean.startsWith('0')) {
    clean = clean.slice(1)
  }

  const candidates = new Set<string>()
  candidates.add(clean)

  if (clean.length === 13 && /^97[89]\d{10}$/.test(clean)) {
    const isbn10 = isbn13ToIsbn10(clean)
    if (isbn10) {
      candidates.add(isbn10)
    }
  }

  if (clean.length === 10) {
    const isbn13 = isbn10ToIsbn13(clean)
    if (isbn13) {
      candidates.add(isbn13)
    }
  }

  return [...candidates]
}

export function pickCanonicalIsbn(candidates: string[]): string {
  const isbn13 = candidates.find((c) => c.length === 13 && /^97[89]/.test(c))
  if (isbn13) {
    return isbn13
  }

  return candidates[0] ?? ''
}
