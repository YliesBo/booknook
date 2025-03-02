// lib/api/googleBooksApi.ts
const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';

export type GoogleBookItem = {
  id: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
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
    printType?: string;  // 'BOOK' ou 'MAGAZINE'
    maturityRating?: string;
  };
};

export type GoogleBooksResponse = {
  items: GoogleBookItem[];
  totalItems: number;
};

export async function searchGoogleBooks(query: string, maxResults: number = 20): Promise<GoogleBookItem[]> {
  try {
    // Ajout de printType=books pour récupérer uniquement les livres (pas les magazines)
    const url = `${GOOGLE_BOOKS_API_URL}?q=${encodeURIComponent(query)}&maxResults=${maxResults}&printType=books`;
    
    console.log(`Fetching Google Books API: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Books API responded with status: ${response.status}`);
    }
    
    const data: GoogleBooksResponse = await response.json();
    
    // Filtrer les résultats sans titre ou avec des titres vides
    const validResults = (data.items || []).filter(item => 
      item.volumeInfo && 
      item.volumeInfo.title && 
      item.volumeInfo.title.trim() !== ''
    );
    
    return validResults;
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