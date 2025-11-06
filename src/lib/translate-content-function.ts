// supabase/functions/translate-content/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TranslationRequest {
  contentType: 'product' | 'announcement' | 'document'
  contentId: string
  sourceLanguage: string
  targetLanguages: string[]
  fields: {
    name?: string
    description?: string
    short_description?: string
    features?: string
    title?: string
    content?: string
    [key: string]: any
  }
}

async function translateWithDeepL(text: string, targetLang: string, apiKey: string): Promise<string> {
  // DeepL language codes: EN, DE, FR, ES, IT
  const langMap: Record<string, string> = {
    'en': 'EN',
    'de': 'DE',
    'fr': 'FR',
    'es': 'ES',
    'it': 'IT'
  }

  const response = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      target_lang: langMap[targetLang],
      source_lang: 'EN',
      formality: 'default',
      preserve_formatting: true
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`DeepL API error: ${errorData.message || response.statusText}`)
  }

  const data = await response.json()
  return data.translations[0].text
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { contentType, contentId, sourceLanguage, targetLanguages, fields } = await req.json() as TranslationRequest

    const deeplApiKey = Deno.env.get('DEEPL_API_KEY')

    if (!deeplApiKey) {
      throw new Error('DEEPL_API_KEY not configured. Add it in Edge Function settings.')
    }

    const results: any[] = []

    console.log(`Translating ${contentType} ${contentId} to languages: ${targetLanguages.join(', ')}`)

    // Translate to each target language
    for (const targetLang of targetLanguages) {
      console.log(`Translating to ${targetLang}...`)
      
      // Translate each field
      for (const [fieldName, fieldValue] of Object.entries(fields)) {
        if (!fieldValue || typeof fieldValue !== 'string') continue

        try {
          const translatedText = await translateWithDeepL(fieldValue, targetLang, deeplApiKey)
          
          console.log(`Translated ${fieldName}: "${fieldValue}" -> "${translatedText}"`)

          // Insert/update in content_translations table
          const { error } = await supabase
            .from('content_translations')
            .upsert({
              content_type: contentType,
              content_id: contentId,
              field_name: fieldName,
              language_code: targetLang,
              translated_text: translatedText
            }, {
              onConflict: 'content_type,content_id,field_name,language_code'
            })

          if (error) {
            console.error(`Database error for ${fieldName}:`, error)
            throw error
          }
          
          results.push({
            field: fieldName,
            language: targetLang,
            success: true,
            translation: translatedText
          })
        } catch (error: any) {
          console.error(`Translation error for ${fieldName} to ${targetLang}:`, error.message)
          results.push({
            field: fieldName,
            language: targetLang,
            success: false,
            error: error.message
          })
        }
      }
    }

    // Check if all translations succeeded
    const allSuccess = results.every(r => r.success)

    return new Response(
      JSON.stringify({ 
        success: allSuccess, 
        results,
        message: allSuccess ? 'All translations completed successfully' : 'Some translations failed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Translation function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Translation failed',
        details: error.toString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
