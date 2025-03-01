// lib/utils/imageUtils.ts

/**
 * Précharge une image et vérifie si elle est valide
 * 
 * @param url URL de l'image à vérifier
 * @returns Une promesse qui se résout avec l'URL si l'image est valide, ou null si elle ne l'est pas
 */
export function preloadImage(url: string): Promise<string | null> {
    return new Promise((resolve) => {
      if (!url) {
        resolve(null);
        return;
      }
  
      const img = new Image();
      
      // Définir un timeout pour éviter d'attendre trop longtemps
      const timeout = setTimeout(() => {
        console.warn(`Timeout lors du chargement de l'image: ${url}`);
        resolve(null);
      }, 5000);
      
      img.onload = () => {
        clearTimeout(timeout);
        
        // Vérifier les dimensions - si l'image est trop petite, elle est probablement vide
        if (img.width < 10 || img.height < 10) {
          console.warn(`Image trop petite (${img.width}x${img.height}): ${url}`);
          resolve(null);
          return;
        }
        
        resolve(url);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        console.warn(`Erreur de chargement de l'image: ${url}`);
        resolve(null);
      };
      
      img.src = url;
    });
  }
  
  /**
   * Essaie plusieurs URLs d'images et retourne la première valide
   * 
   * @param urls Array d'URLs à essayer dans l'ordre
   * @returns Une promesse qui se résout avec la première URL valide ou null si aucune n'est valide
   */
  export async function tryMultipleImages(urls: (string | null)[]): Promise<string | null> {
    // Filtrer les URLs nulles
    const validUrls = urls.filter(url => url !== null) as string[];
    
    for (const url of validUrls) {
      const result = await preloadImage(url);
      if (result) {
        return result;
      }
    }
    
    return null;
  }