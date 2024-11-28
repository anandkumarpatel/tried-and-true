import { createFileRoute } from '@tanstack/react-router'
import { Recipe } from '../../types'

export const Route = createFileRoute('/recipe/$recipeId')({
  loader: async ({ params }) => {
    const response = await fetch(`http://localhost:3000/recipe/${params.recipeId}`)
    const recipe = (await response.json()) as Recipe
    return recipe
  },
  component: RecipePage,
})

function RecipePage() {
  const { recipe } = Route.useLoaderData() as { recipe: Recipe }

  return (
    <div>
      <h2>{recipe.title}</h2>
      <p>
        Prep Time: {recipe.prepTime} {recipe.prepTimeUnit}
      </p>
      <p>
        Cook Time: {recipe.cookTime} {recipe.cookTimeUnit}
      </p>
      <p>
        Total Time: {recipe.totalTime} {recipe.totalTimeUnit}
      </p>
      <p>Servings: {recipe.servings}</p>
      {recipe.mainImage && <img src={recipe.mainImage} alt={recipe.title} />}
      <h3>Ingredients</h3>
      <ul>
        {recipe.ingredients.map((ingredient, index) => (
          <li key={index}>
            {ingredient.amount} {ingredient.amountUnit} {ingredient.name} {ingredient.preparation && `(${ingredient.preparation})`}
            {ingredient.notes && ` - ${ingredient.notes}`}
          </li>
        ))}
      </ul>
      <h3>Directions</h3>
      <ol>
        {recipe.directions.map((direction, index) => (
          <li key={index}>
            {direction.instruction}
            {direction.image && <img src={direction.image} alt={`Step ${index + 1}`} />}
          </li>
        ))}
      </ol>
      {recipe.notes && (
        <>
          <h3>Notes</h3>
          <ul>
            {recipe.notes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default RecipePage