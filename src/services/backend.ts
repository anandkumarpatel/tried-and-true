import { Recipe, RecipeRes, RecipesRes } from '../types'

const baseUrl = import.meta.env.VITE_BACKEND_URL

export const scrape = async (url: string): Promise<Recipe> => {
  try {
    const response = await fetch(`${baseUrl}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    })
    const data = await response.json()
    return data.recipe
  } catch (error) {
    console.error('Error fetching recipe:', error)
    throw error
  }
}

export const listRecipes = async (): Promise<Recipe[]> => {
  const response = await fetch(`${baseUrl}/recipes`)
  const { recipes } = (await response.json()) as RecipesRes
  return recipes
}

export const getRecipe = async (recipeId: string): Promise<Recipe> => {
  const response = await fetch(`${baseUrl}/recipe/${recipeId}`)
  const { recipe } = (await response.json()) as RecipeRes
  return recipe
}

export const deleteRecipe = async (recipeId: string): Promise<void> => {
  const response = await fetch(`${baseUrl}/recipe/${recipeId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error('Failed to delete the recipe')
  }
}

export const updateRecipe = async (recipeId: string, update: Partial<Recipe>): Promise<void> => {
  // TODO add route on backend
  const response = await fetch(`${baseUrl}/recipe/${recipeId}/ingredients`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(update),
  })
  if (!response.ok) {
    throw new Error('Failed to save ingredients')
  }
}