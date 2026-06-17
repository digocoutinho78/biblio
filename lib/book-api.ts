export interface BookData {
  isbn: string
  titulo: string
  autor: string
  editora: string
  descricao: string
  capaUrl: string
  dataPublicacao: string
}

/**
 * Search for a book by ISBN using Open Library API
 */
export async function searchByISBN(isbn: string): Promise<BookData | null> {
  try {
    // Try Open Library first
    const openLibraryUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    const response = await fetch(openLibraryUrl)
    const data = await response.json()

    if (data && Object.keys(data).length > 0) {
      const bookKey = Object.keys(data)[0]
      const book = data[bookKey]

      return {
        isbn: isbn,
        titulo: book.title || '',
        autor:
          book.authors && book.authors.length > 0
            ? book.authors[0].name
            : 'Autor desconhecido',
        editora: book.publishers && book.publishers.length > 0 
          ? book.publishers[0].name
          : 'Editora desconhecida',
        descricao: book.description || '',
        capaUrl:
          book.cover && book.cover.large
            ? book.cover.large
            : book.cover && book.cover.medium
              ? book.cover.medium
              : '/default-book-cover.png',
        dataPublicacao: book.publish_date || '',
      }
    }

    // Try Google Books as fallback
    return await searchGoogleBooks(isbn)
  } catch (error) {
    console.error('[v0] Error searching by ISBN:', error)
    return null
  }
}

/**
 * Search for books by title or author using Google Books API
 */
export async function searchGoogleBooks(
  query: string
): Promise<BookData | null> {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query
    )}&maxResults=1`
    const response = await fetch(url)
    const data = await response.json()

    if (data.items && data.items.length > 0) {
      const book = data.items[0].volumeInfo
      const isbn = book.industryIdentifiers?.[0]?.identifier || ''

      return {
        isbn: isbn,
        titulo: book.title || '',
        autor:
          book.authors && book.authors.length > 0
            ? book.authors.join(', ')
            : 'Autor desconhecido',
        editora: book.publisher || 'Editora desconhecida',
        descricao: book.description || '',
        capaUrl: book.imageLinks?.thumbnail || '/default-book-cover.png',
        dataPublicacao: book.publishedDate || '',
      }
    }

    return null
  } catch (error) {
    console.error('[v0] Error searching Google Books:', error)
    return null
  }
}
