export interface BookData {
  isbn: string
  titulo: string
  autor: string
  editora: string
  dataPublicacao: string
  descricao: string
  capaUrl: string
}

function normalizeIsbn(isbn: string): string {
  return isbn.replace(/[^0-9Xx]/g, '')
}

function toHttpsUrl(url: string): string {
  return url.replace(/^http:/, 'https:')
}

export async function searchByISBN(isbn: string): Promise<BookData | null> {
  const normalizedIsbn = normalizeIsbn(isbn)

  if (normalizedIsbn.length < 10) {
    console.log('[book-api] ISBN inválido:', normalizedIsbn)
    return null
  }

  try {
    console.log('[book-api] Buscando Google Books para ISBN:', normalizedIsbn)

    const googleRes = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(normalizedIsbn)}`,
    )
    const googleData = await googleRes.json()

    console.log('[book-api] Google Books totalItems:', googleData.totalItems)

    if (googleData.totalItems > 0 && googleData.items?.length) {
      const book = googleData.items[0].volumeInfo
      const result: BookData = {
        isbn: normalizedIsbn,
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

      console.log('[book-api] Google Books encontrou:', result.titulo)
      return result
    }

    console.log('[book-api] Tentando Open Library para ISBN:', normalizedIsbn)

    const olRes = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(normalizedIsbn)}&format=json&jscmd=data`,
    )
    const olData = await olRes.json()
    const olBook = olData[`ISBN:${normalizedIsbn}`]

    if (olBook) {
      const description =
        typeof olBook.description === 'string'
          ? olBook.description
          : olBook.description?.value || ''

      const result: BookData = {
        isbn: normalizedIsbn,
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

      console.log('[book-api] Open Library encontrou:', result.titulo)
      return result
    }

    console.log('[book-api] Nenhum resultado para ISBN:', normalizedIsbn)
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
