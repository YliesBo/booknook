// lib/api/googleBooksApi.ts
const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';

export type GoogleBookItem = {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    language?: string;
  };
};

export type GoogleBooksResponse = {
  items: GoogleBookItem[];
  totalItems: number;
};

export async function searchGoogleBooks(query: string, maxResults: number = 20): Promise<GoogleBookItem[]> {
  try {
    const response = await fetch(
      `${GOOGLE_BOOKS_API_URL}?q=${encodeURIComponent(query)}&maxResults=${maxResults}`
    );
    
    if (!response.ok) {
      throw new Error(`Google Books API responded with status: ${response.status}`);
    }
    
    const data: GoogleBooksResponse = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching from Google Books API:', error);
    return [];
  }
}

export async function getBookDetails(googleBookId: string): Promise<GoogleBookItem | null> {
  try {
    const response = await fetch(`${GOOGLE_BOOKS_API_URL}/${googleBookId}`);
    
    if (!response.ok) {
      throw new Error(`Google Books API responded with status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching book details from Google Books API:', error);
    return null;
  }
}