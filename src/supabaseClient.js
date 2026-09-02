import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://kzsmchyowjueksdivsaa.supabase.co',
  'sb_publishable_t_DaoarjNOLHhLHGoJWYsg_s8hfeGWW'
);

// The app refers to projects by short slugs ('nti-sylvania', etc.), but the
// database uses real UUIDs. This loads that mapping once and caches it.
let idBySlug = {};
let slugById = {};
let loadPromise = null;

export function loadProjectMap() {
  if (!loadPromise) {
    loadPromise = supabase
      .from('projects')
      .select('id, slug')
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load project map:', error);
          return;
        }
        (data || []).forEach((p) => {
          idBySlug[p.slug] = p.id;
          slugById[p.id] = p.slug;
        });
      });
  }
  return loadPromise;
}

export function projectIdForSlug(slug) {
  return idBySlug[slug] || null;
}

export function projectSlugForId(id) {
  return slugById[id] || null;
}
