import { getIsbnCandidates, pickCanonicalIsbn } from '@/lib/isbn'

export interface BookData {
  isbn: string
  titulo: string
  autor: string
  editora: string
  dataPublicacao: string
  descricao: string
  capaUrl: string
}

function toHttpsUrl(url: string): string {
  return url.replace(/^http:/, 'https:')
}

async function searchGoogleBooksByIsbn(isbn: string): Promise<BookData | null> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=1`
  console.log('[book-api] Google Books URL:', url)

  const response = await fetch(url)
  if (!response.ok) {
    console.log('[book-api] Google Books HTTP', response.status)
    return null
  }

  const data = await response.json()
  console.log('[book-api] Google Books items:', data.items?.length ?? 0, 'totalItems:', data.totalItems)

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
}

async function searchOpenLibraryByIsbn(
  candidates: string[],
): Promise<BookData | null> {
  const bibkeys = candidates.map((c) => `ISBN:${c}`).join(',')
  const url = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(bibkeys)}&format=json&jscmd=data`
  console.log('[book-api] Open Library bibkeys:', bibkeys)

  const response = await fetch(url)
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
}

async function searchOpenLibrarySearch(isbn: string): Promise<BookData | null> {
  const url = `https://openlibrary.org/search.json?isbn=${encodeURIComponent(isbn)}&limit=1`
  console.log('[book-api] Open Library search:', url)

  const response = await fetch(url)
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
    dataPublicacao: doc.first_publish_year ? String(doc.first_publish_year) : '',
    descricao: '',
    capaUrl: coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
      : '',
  }
}

export function getIsbnSearchVariants(raw: string): string[] {
  return getIsbnCandidates(raw)
}

export async function searchByISBN(raw: string): Promise<BookData | null> {
  const candidates = getIsbnCandidates(raw)

  if (candidates.length === 0) {
    console.log('[book-api] Nenhuma variante ISBN para:', raw)
    return null
  }

  console.log('[book-api] Variantes ISBN:', candidates.join(', '))

  try {
    for (const isbn of candidates) {
      const googleBook = await searchGoogleBooksByIsbn(isbn)
      if (googleBook) {
        googleBook.isbn = pickCanonicalIsbn(candidates) || googleBook.isbn
        console.log('[book-api] Encontrado no Google Books:', googleBook.titulo)
        return googleBook
      }
    }

    const openLibraryBook = await searchOpenLibraryByIsbn(candidates)
    if (openLibraryBook) {
      console.log('[book-api] Encontrado no Open Library:', openLibraryBook.titulo)
      return openLibraryBook
    }

    for (const isbn of candidates) {
      const searchResult = await searchOpenLibrarySearch(isbn)
      if (searchResult) {
        searchResult.isbn = pickCanonicalIsbn(candidates) || searchResult.isbn
        return searchResult
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
    const response = await fetch(url)
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

export function bookDataToLivroInsert(
  bookData: BookData,
  userId: string,
): Record<string, unknown> {
  return {
    user_id: userId,
    isbn: bookData.isbn,
    titulo: bookData.titulo,
    autor: bookData.autor,
    editora: bookData.editora || null,
    sinopse: bookData.descricao || null,
    ano_publicacao: parsePublicationYear(bookData.dataPublicacao),
    capa_url: bookData.capaUrl || null,
  }
}
