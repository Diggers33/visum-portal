import { supabase } from './supabase';

/**
 * Load translations for a specific content item
 * @param contentType - Type of content (product, announcement, document)
 * @param contentId - ID of the content item
 * @param languageCode - Language code (de, fr, es, it)
 * @returns Object with translated fields
 */
export async function loadTranslations(
  contentType: 'product' | 'announcement' | 'document',
  contentId: string,
  languageCode: string
): Promise<Record<string, string>> {
  // If language is English, no translation needed
  if (languageCode === 'en') {
    return {};
  }

  try {
    const { data, error } = await supabase
      .from('content_translations')
      .select('*')
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .eq('language_code', languageCode);

    if (error) {
      console.error('Error loading translations:', error);
      return {};
    }

    // Convert array to object: { field_name: translated_text }
    const translations: Record<string, string> = {};
    if (data && data.length > 0) {
      data.forEach((item) => {
        translations[item.field_name] = item.translated_text;
      });
    }

    return translations;
  } catch (error) {
    console.error('Error loading translations:', error);
    return {};
  }
}

/**
 * Apply translations to an object
 * Returns a new object with translated fields (falls back to original if translation missing)
 * @param original - Original object with English content
 * @param translations - Translations object from loadTranslations
 * @returns New object with translated fields
 */
export function applyTranslations<T extends Record<string, any>>(
  original: T,
  translations: Record<string, string>
): T {
  const result = { ...original };

  // Apply each translation
  Object.keys(translations).forEach((field) => {
    if (translations[field] && translations[field].trim() !== '') {
      result[field] = translations[field];
    }
  });

  return result;
}

/**
 * Load and apply translations for a product
 * @param product - Original product object
 * @param languageCode - Language code (de, fr, es, it)
 * @returns Product with translated fields
 */
export async function getTranslatedProduct<T extends { id: string }>(
  product: T,
  languageCode: string
): Promise<T> {
  if (languageCode === 'en') {
    return product;
  }

  const translations = await loadTranslations('product', product.id, languageCode);
  return applyTranslations(product, translations);
}

/**
 * Load and apply translations for multiple products
 * @param products - Array of product objects
 * @param languageCode - Language code (de, fr, es, it)
 * @returns Array of products with translated fields
 */
export async function getTranslatedProducts<T extends { id: string }>(
  products: T[],
  languageCode: string
): Promise<T[]> {
  if (languageCode === 'en' || products.length === 0) {
    return products;
  }

  // Load all translations for these products in one query
  const productIds = products.map(p => p.id);
  
  try {
    const { data, error } = await supabase
      .from('content_translations')
      .select('*')
      .eq('content_type', 'product')
      .in('content_id', productIds)
      .eq('language_code', languageCode);

    if (error) {
      console.error('Error loading bulk translations:', error);
      return products;
    }

    // Group translations by product ID
    const translationsByProduct: Record<string, Record<string, string>> = {};
    if (data && data.length > 0) {
      data.forEach((item) => {
        if (!translationsByProduct[item.content_id]) {
          translationsByProduct[item.content_id] = {};
        }
        translationsByProduct[item.content_id][item.field_name] = item.translated_text;
      });
    }

    // Apply translations to each product
    return products.map((product) => {
      const translations = translationsByProduct[product.id] || {};
      return applyTranslations(product, translations);
    });
  } catch (error) {
    console.error('Error loading bulk translations:', error);
    return products;
  }
}
