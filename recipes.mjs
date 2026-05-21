import recipeData from "./tokens/type.recipe.json" with { type: "json" };

const root = recipeData?.type?.recipe ?? {};

/**
 * Returns a map of recipe ID → { primary, secondary, disallowed, meta }
 * with the raw type family assignments from the design system.
 */
export function getTypeRecipes() {
  const recipes = {};
  for (const [id, spec] of Object.entries(root)) {
    if (id.startsWith("$") || id.startsWith("_")) continue;
    recipes[id] = {
      primary: spec.primary ?? [],
      secondary: spec.secondary ?? [],
      disallowed: spec.disallowed ?? [],
      meta: spec.meta ?? {},
    };
  }
  return recipes;
}

/**
 * Returns a simplified map of recipe ID → { allowed, summary }
 * where `allowed` is the deduplicated union of primary + secondary families,
 * and `summary` is a human-readable string like "display + body + code".
 */
export function getTypeRecipeSummaries() {
  const recipes = getTypeRecipes();
  const summaries = {};
  for (const [id, spec] of Object.entries(recipes)) {
    const allowed = [...spec.primary, ...spec.secondary]
      .filter((v, i, a) => a.indexOf(v) === i);
    summaries[id] = {
      allowed,
      summary: allowed.join(" + "),
    };
  }
  return summaries;
}
