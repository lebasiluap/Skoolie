import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://skoolieapp.com', priority: 1 },
    { url: 'https://skoolieapp.com/terms', priority: 0.3 },
    { url: 'https://skoolieapp.com/privacy', priority: 0.3 },
    { url: 'https://skoolieapp.com/delete-account', priority: 0.3 },
  ]
}
