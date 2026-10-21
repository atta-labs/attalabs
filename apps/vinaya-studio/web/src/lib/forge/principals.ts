/**
 * The logins Studio counts as a Principal. `@attalabs/aeg-core` no longer
 * ships a default list and does not export its config reader, so Studio
 * carries the one login this repo's `vinaya.config.json` declares.
 *
 * TODO: Studio migrates to the standalone Vinaya repo — delete this file
 * there and read `principals` through the supported API instead.
 */
export const STUDIO_PRINCIPALS: string[] = ['daniboomerang']
