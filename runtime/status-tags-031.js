/* WEWG-STATUS-TAGS-0.3.1 (retired compatibility stub).
 * Historically this script wrapped renderPlayers and cleared tags in each render.
 * Status engine 0.4.3 computes tags once, directly from action log, before rendering.
 * Keep this file while the old deployment verification still checks for its marker.
 */
window.WEWG_STATUS_TAGS_PATCH={version:'retired-by-0.4.3'};
