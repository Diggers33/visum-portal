# Multi-Language Announcement Support (EN + ES)

## Overview
Announcements now support both English and Spanish content with automatic language detection and fallback support.

---

## Database Schema

The `announcements` table now includes:

```sql
- title_en (text, nullable) - English title
- title_es (text, nullable) - Spanish title
- content_en (text, nullable) - English content
- content_es (text, nullable) - Spanish content
```

**Legacy fields** (`title`, `content`) are kept for backward compatibility.

---

## Implementation Summary

### 1. Admin Form (AnnouncementsManagement.tsx)

**Features:**
- ✅ Language tabs (English/Español) for creating/editing announcements
- ✅ Validation: At least ONE language must be filled (EN or ES)
- ✅ Visual indicators showing which languages are available (EN only, ES only, EN + ES)
- ✅ Search works across both languages

**Usage:**
1. Click "Create Announcement" or "Edit" an existing announcement
2. Switch between English and Español tabs
3. Fill in Title and Content for at least one language
4. Both languages optional - system validates at least one is complete

**Validation Logic:**
```typescript
const hasEnglish = formData.title_en && formData.content_en;
const hasSpanish = formData.title_es && formData.content_es;

if (!hasEnglish && !hasSpanish) {
  toast.error('Please fill in title and content for at least one language');
  return;
}
```

---

### 2. Distributor Portal Display (WhatsNew.tsx)

**Features:**
- ✅ Automatic language detection from user's language preference
- ✅ Fallback to alternate language if translation not available
- ✅ Search works with current language

**Language Selection Logic:**
```typescript
// If user selected Spanish
if (i18n.language === 'es') {
  display: title_es || title_en || title (legacy)
}

// If user selected English (or any other language)
else {
  display: title_en || title_es || title (legacy)
}
```

**User Experience:**
- User changes language via LanguageSwitcher (Globe icon)
- Announcements instantly update to show preferred language
- If translation doesn't exist, shows available language

---

### 3. API Updates (announcements.ts)

**Updated Interfaces:**

```typescript
export interface Announcement {
  id: string;
  category: string;
  title: string;  // Legacy - kept for backward compatibility
  content: string;  // Legacy - kept for backward compatibility
  title_en?: string;
  title_es?: string;
  content_en?: string;
  content_es?: string;
  status: 'draft' | 'published' | 'archived';
  // ... other fields
}

export interface CreateAnnouncementInput {
  category: string;
  title?: string;  // Legacy - optional now
  content?: string;  // Legacy - optional now
  title_en?: string;
  title_es?: string;
  content_en?: string;
  content_es?: string;
  status: 'draft' | 'published' | 'archived';
  // ... other fields
}
```

**Note:** Edge Function backend automatically handles new fields since database already has columns.

---

## Testing Guide

### Test 1: Create English-Only Announcement

1. Login as admin
2. Go to Announcements Management
3. Click "Create Announcement"
4. Select Category and Status
5. Switch to "English" tab
6. Fill in Title: "New Product: VISUM Pro"
7. Fill in Content: "We are excited to announce..."
8. Leave Spanish tab empty
9. Click "Create Announcement"

**Expected:**
- ✅ Saves successfully
- ✅ Shows "(EN only)" indicator in list

### Test 2: Create Spanish-Only Announcement

1. Repeat above but fill ONLY Spanish tab
2. Title: "Nuevo Producto: VISUM Pro"
3. Content: "Estamos emocionados de anunciar..."

**Expected:**
- ✅ Saves successfully
- ✅ Shows "(ES only)" indicator in list

### Test 3: Create Bilingual Announcement

1. Fill BOTH English and Spanish tabs
2. English Title: "System Maintenance"
3. Spanish Title: "Mantenimiento del Sistema"
4. Fill content in both languages

**Expected:**
- ✅ Saves successfully
- ✅ Shows "(EN + ES)" indicator in list

### Test 4: Validation - Empty Announcement

1. Create announcement with category/status
2. Leave BOTH language tabs empty
3. Try to submit

**Expected:**
- ❌ Shows error: "Please fill in title and content for at least one language"
- ❌ Does not save

### Test 5: Distributor Portal - Language Switching

1. Login as distributor user
2. Go to "What's New" page
3. Create a bilingual announcement (both EN + ES)
4. In distributor portal, switch language to Spanish (Globe icon → Español)

**Expected:**
- ✅ Announcements show Spanish versions
- ✅ Search works in Spanish

5. Switch language back to English

**Expected:**
- ✅ Announcements show English versions
- ✅ Search works in English

### Test 6: Fallback Behavior

1. Create announcement with ONLY English
2. Login as distributor
3. Switch to Spanish language

**Expected:**
- ✅ Shows English version (fallback)
- ✅ No errors or blank content

---

## Migration Notes

### Existing Announcements

Old announcements with `title` and `content` fields still work:

```typescript
// Old announcement
{
  title: "Welcome",
  content: "Welcome message",
  title_en: null,
  title_es: null
}

// Display logic handles fallback
getDisplayTitle() → returns "Welcome" (legacy field)
```

### Updating Old Announcements

To add translations to existing announcements:

1. Edit the announcement
2. Click English tab → content auto-populated from legacy field (if empty)
3. Click Spanish tab → add translation
4. Save

---

## Files Modified

### Created:
- `MULTI_LANGUAGE_ANNOUNCEMENTS.md` - This documentation

### Modified:
- `src/lib/api/announcements.ts` - Updated interfaces
- `src/components/admin/AnnouncementsManagement.tsx` - Added language tabs
- `src/components/WhatsNew.tsx` - Added language detection and display logic

---

## Future Enhancements

### Adding More Languages

To add French, German, Italian, etc:

1. **Database:** Add columns `title_fr`, `content_fr`, etc.

2. **Admin Form:** Update tabs:
```typescript
<TabsList className="grid w-full grid-cols-4">
  <TabsTrigger value="en">English</TabsTrigger>
  <TabsTrigger value="es">Español</TabsTrigger>
  <TabsTrigger value="fr">Français</TabsTrigger>
  <TabsTrigger value="de">Deutsch</TabsTrigger>
</TabsList>
```

3. **Display Logic:** Update helper functions:
```typescript
const getDisplayTitle = (announcement: Announcement): string => {
  const currentLang = i18n.language;

  // Check current language
  if (currentLang === 'es') return announcement.title_es || ...
  if (currentLang === 'fr') return announcement.title_fr || ...
  if (currentLang === 'de') return announcement.title_de || ...

  // Default to English
  return announcement.title_en || ...
};
```

---

## Troubleshooting

### Issue: Language not switching in portal

**Solution:** Check that user has changed language via LanguageSwitcher (Globe icon). Language persists in `regional_settings` table.

### Issue: Validation error even with content

**Solution:** Both title AND content must be filled for a language to count as "complete".

### Issue: Old announcements not showing

**Solution:** Check fallback chain - should display legacy `title`/`content` fields if new fields are null.

---

## Summary

Multi-language support is now fully implemented:

✅ Admin can create announcements in EN, ES, or both
✅ Distributors see announcements in their preferred language
✅ Automatic fallback if translation missing
✅ Backward compatible with old announcements
✅ Search works across all languages
✅ Build passes with no errors

The system is production-ready!
