/**
 * Deep-link alias: OAuth redirects land on skoolie://auth/callback, which
 * Android delivers as a navigation to the literal path "auth/callback".
 * The real screen lives in the (auth) group (path "/callback") — group
 * segments don't exist in URLs, so without this alias Android showed an
 * "unmatched route" flash after Google sign-in.
 */
export { default } from '../(auth)/callback'
