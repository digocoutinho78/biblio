import {
  getIsbnCandidates,
  normalizeIsbnDigits,
  pickCanonicalIsbn,
} from '@/lib/isbn'

export interface BookData {
  isbn: string
  titulo: string
  autor: string
  editora: string
  dataPublicacao: string
  descricao: string
  capaUrl: string
}

const FETCH_TIMEOUT_MS = 8000

function toHttpsUrl(url: string): string {
  return url.replace(/^http:/, 'https:')
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

export function googleShoppingUrl(titulo: string, autor: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(
    `${titulo} ${autor}`,
  )}&tbm=shop`
}

async function searchGoogleBooksByIsbn(isbn: string): Promise<BookData | null> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=1`
  console.log('[book-api] Google Books URL:', url)

  try {
    const response = await fetchWithTimeout(url)
    if (!response.ok) {
      console.log('[book-api] Google Books HTTP', response.status)
      return null
    }

    const data = await response.json()
    console.log(
      '[book-api] Google Books items:',
      data.items?.length ?? 0,
      'totalItems:',
      data.totalItems,
    )

    if (!data.items?.length) {
      return null
    }

    const book = data.items[0].volumeInfo
    const identifiers = book.industryIdentifiers ?? []
    const matchedIsbn =
      identifiers.find((id: { type: string; identifier: string }) =>
        /ISBN/i.test(id.type),
      )?.identifier ?? isbn

    return {
      isbn: matchedIsbn.replace(/[^0-9Xx]/g, '').toUpperCase() || isbn,
      titulo: book.title || 'Sem título',
      autor: book.authors?.join(', ') || 'Autor desconhecido',
      editora: book.publisher || '',
      dataPublicacao: book.publishedDate || '',
      descricao: book.description || '',
      capaUrl: book.imageLinks?.thumbnail
        ? toHttpsUrl(book.imageLinks.thumbnail)
        : book.imageLinks?.smallThumbnail
          ? toHttpsUrl(book.imageLinks.smallThumbnail)
          : '',
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.log('[book-api] Google Books timeout para ISBN:', isbn)
    } else {
      console.error('[book-api] Google Books error:', err)
    }
    return null
  }
}

async function searchOpenLibraryByIsbn(
  candidates: string[],
): Promise<BookData | null> {
  const bibkeys = candidates.map((c) => `ISBN:${c}`).join(',')
  const url = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(bibkeys)}&format=json&jscmd=data`
  console.log('[book-api] Open Library bibkeys:', bibkeys)

  try {
    const response = await fetchWithTimeout(url)
    if (!response.ok) {
      console.log('[book-api] Open Library HTTP', response.status)
      return null
    }

    const data = await response.json()

    for (const candidate of candidates) {
      const olBook = data[`ISBN:${candidate}`]
      if (!olBook) {
        continue
      }

      const description =
        typeof olBook.description === 'string'
          ? olBook.description
          : olBook.description?.value || ''

      console.log('[book-api] Open Library encontrou via ISBN:', candidate)

      return {
        isbn: pickCanonicalIsbn(candidates) || candidate,
        titulo: olBook.title || 'Sem título',
        autor: olBook.authors?.[0]?.name || 'Autor desconhecido',
        editora: olBook.publishers?.[0]?.name || '',
        dataPublicacao: olBook.publish_date || '',
        descricao: description,
        capaUrl: olBook.cover?.medium
          ? toHttpsUrl(olBook.cover.medium)
          : olBook.cover?.large
            ? toHttpsUrl(olBook.cover.large)
            : olBook.cover?.small
              ? toHttpsUrl(olBook.cover.small)
              : '',
      }
    }

    return null
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.log('[book-api] Open Library bibkeys timeout')
    } else {
      console.error('[book-api] Open Library bibkeys error:', err)
    }
    return null
  }
}

async function searchOpenLibrarySearch(isbn: string): Promise<BookData | null> {
  const url = `https://openlibrary.org/search.json?isbn=${encodeURIComponent(isbn)}&limit=1`
  console.log('[book-api] Open Library search:', url)

  try {
    const response = await fetchWithTimeout(url)
    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const doc = data.docs?.[0]
    if (!doc) {
      return null
    }

    console.log('[book-api] Open Library search encontrou:', doc.title)

    const coverId = doc.cover_i
    return {
      isbn,
      titulo: doc.title || 'Sem título',
      autor: doc.author_name?.join(', ') || 'Autor desconhecido',
      editora: doc.publisher?.[0] || '',
      dataPublicacao: doc.first_publish_year
        ? String(doc.first_publish_year)
        : '',
      descricao: '',
      capaUrl: coverId
        ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
        : '',
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.log('[book-api] Open Library search timeout para ISBN:', isbn)
    } else {
      console.error('[book-api] Open Library search error:', err)
    }
    return null
  }
}

export function getIsbnSearchVariants(raw: string): string[] {
  return getIsbnCandidates(raw)
}

export async function searchByISBN(raw: string): Promise<BookData | null> {
  const clean = normalizeIsbnDigits(raw)

  if (!clean || clean.length < 10) {
    console.log('[book-api] ISBN inválido após normalização:', raw)
    return null
  }

  const candidates = getIsbnCandidates(raw)

  if (candidates.length === 0) {
    console.log('[book-api] Nenhuma variante ISBN para:', raw)
    return null
  }

  console.log('[book-api] ISBN normalizado:', clean, '→ variantes:', candidates.join(', '))

  const canonicalIsbn = pickCanonicalIsbn(candidates)
  const isbn13Candidates = candidates.filter((c) => c.length === 13)
  const isbn10Candidates = candidates.filter((c) => c.length === 10)

  try {
    // 1. Google Books com ISBN-13 (prioridade)
    for (const isbn of isbn13Candidates) {
      const googleBook = await searchGoogleBooksByIsbn(isbn)
      if (googleBook) {
        googleBook.isbn = canonicalIsbn || googleBook.isbn
        console.log('[book-api] Encontrado no Google Books (ISBN-13):', googleBook.titulo)
        return googleBook
      }
    }

    // 2. Open Library com todas as variantes (inclui ISBN-10 original)
    const openLibraryBook = await searchOpenLibraryByIsbn(candidates)
    if (openLibraryBook) {
      openLibraryBook.isbn = canonicalIsbn || openLibraryBook.isbn
      console.log('[book-api] Encontrado no Open Library:', openLibraryBook.titulo)
      return openLibraryBook
    }

    // 3. Open Library search por ISBN-10 e outras variantes
    for (const isbn of isbn10Candidates.length > 0 ? isbn10Candidates : candidates) {
      const searchResult = await searchOpenLibrarySearch(isbn)
      if (searchResult) {
        searchResult.isbn = canonicalIsbn || searchResult.isbn
        console.log('[book-api] Encontrado no Open Library search:', searchResult.titulo)
        return searchResult
      }
    }

  // 4. Google Books com ISBN-10 como fallback adicional
    for (const isbn of isbn10Candidates) {
      const googleBook = await searchGoogleBooksByIsbn(isbn)
      if (googleBook) {
        googleBook.isbn = canonicalIsbn || googleBook.isbn
        console.log('[book-api] Encontrado no Google Books (ISBN-10):', googleBook.titulo)
        return googleBook
      }
    }

    console.log('[book-api] Nenhum resultado para variantes:', candidates.join(', '))
    return null
  } catch (err) {
    console.error('[book-api] Erro:', err)
    return null
  }
}

/**
 * Search for books by title or author using Google Books API
 */
export async function searchGoogleBooks(
  query: string,
): Promise<BookData | null> {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`
    const response = await fetchWithTimeout(url)
    const data = await response.json()

    if (data.items?.length) {
      const book = data.items[0].volumeInfo
      return {
        isbn: book.industryIdentifiers?.[0]?.identifier || '',
        titulo: book.title || 'Sem título',
        autor: book.authors?.join(', ') || 'Autor desconhecido',
        editora: book.publisher || '',
        dataPublicacao: book.publishedDate || '',
        descricao: book.description || '',
        capaUrl: book.imageLinks?.thumbnail
          ? toHttpsUrl(book.imageLinks.thumbnail)
          : '',
      }
    }

    return null
  } catch (error) {
    console.error('[book-api] Error searching Google Books:', error)
    return null
  }
}

function parsePublicationYear(dataPublicacao: string): number | null {
  const match = dataPublicacao.match(/\d{4}/)
  if (!match) {
    return null
  }

  const year = parseInt(match[0], 10)
  return Number.isNaN(year) ? null : year
}

export interface LivroInsertExtras {
  leitura_completa?: boolean
  avaliacao?: number | null
  notas?: string | null
  comentario?: string | null
}

export function bookDataToLivroInsert(
  bookData: BookData,
  userId: string,
  extras?: LivroInsertExtras,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    user_id: userId,
    isbn: bookData.isbn,
    titulo: bookData.titulo,
    autor: bookData.autor,
    editora: bookData.editora || null,
    sinopse: bookData.descricao || null,
    ano_publicacao: parsePublicationYear(bookData.dataPublicacao),
    capa_url: bookData.capaUrl || null,
  }

  if (extras) {
    if (extras.leitura_completa !== undefined) {
      row.leitura_completa = extras.leitura_completa
    }
    if (extras.avaliacao !== undefined) {
      row.avaliacao = extras.avaliacao
    }
    if (extras.notas !== undefined) {
      row.notas = extras.notas
    }
    if (extras.comentario !== undefined) {
      row.comentario = extras.comentario
    }
  }

  return row
}
