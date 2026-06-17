export interface BookData {
  isbn: string
  titulo: string
  autor: string
  editora: string
  descricao: string
  capaUrl: string
  dataPublicacao: string
}

function normalizeIsbn(isbn: string): string {
  return isbn.replace(/[^0-9Xx]/g, '')
}

function mapGoogleVolumeToBook(
  volumeInfo: {
    title?: string
    authors?: string[]
    publisher?: string
    description?: string
    imageLinks?: { thumbnail?: string; smallThumbnail?: string }
    publishedDate?: string
    industryIdentifiers?: { identifier: string }[]
  },
  fallbackIsbn: string,
): BookData {
  const isbn =
    volumeInfo.industryIdentifiers?.find((id) =>
      /^(97(8|9))?\d{9}[\dXx]$/.test(id.identifier),
    )?.identifier ??
    volumeInfo.industryIdentifiers?.[0]?.identifier ??
    fallbackIsbn

  return {
    isbn,
    titulo: volumeInfo.title || '',
    autor:
      volumeInfo.authors && volumeInfo.authors.length > 0
        ? volumeInfo.authors.join(', ')
        : 'Autor desconhecido',
    editora: volumeInfo.publisher || 'Editora desconhecida',
    descricao: volumeInfo.description || '',
    capaUrl:
      volumeInfo.imageLinks?.thumbnail ||
      volumeInfo.imageLinks?.smallThumbnail ||
      '/default-book-cover.png',
    dataPublicacao: volumeInfo.publishedDate || '',
  }
}

async function searchGoogleBooksByISBN(isbn: string): Promise<BookData | null> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=1`
  const response = await fetch(url)

  if (!response.ok) {
    return null
  }

  const data = await response.json()

  if (!data.items?.length) {
    return null
  }

  return mapGoogleVolumeToBook(data.items[0].volumeInfo, isbn)
}

async function searchOpenLibraryByISBN(isbn: string): Promise<BookData | null> {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`
  const response = await fetch(url)

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  const bookKey = Object.keys(data)[0]

  if (!bookKey) {
    return null
  }

  const book = data[bookKey]
  const description =
    typeof book.description === 'string'
      ? book.description
      : book.description?.value || ''

  return {
    isbn,
    titulo: book.title || '',
    autor:
      book.authors?.length > 0 ? book.authors[0].name : 'Autor desconhecido',
    editora:
      book.publishers?.length > 0
        ? book.publishers[0].name
        : 'Editora desconhecida',
    descricao: description,
    capaUrl:
      book.cover?.large ||
      book.cover?.medium ||
      book.cover?.small ||
      '/default-book-cover.png',
    dataPublicacao: book.publish_date || '',
  }
}

/**
 * Search for a book by ISBN using Google Books, with Open Library as fallback.
 */
export async function searchByISBN(isbn: string): Promise<BookData | null> {
  const normalizedIsbn = normalizeIsbn(isbn)

  if (normalizedIsbn.length < 10) {
    return null
  }

  try {
    const googleBook = await searchGoogleBooksByISBN(normalizedIsbn)
    if (googleBook) {
      return googleBook
    }

    return await searchOpenLibraryByISBN(normalizedIsbn)
  } catch (error) {
    console.error('[book-api] Error searching by ISBN:', error)
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
      return mapGoogleVolumeToBook(data.items[0].volumeInfo, '')
    }

    return null
  } catch (error) {
    console.error('[book-api] Error searching Google Books:', error)
    return null
  }
}
