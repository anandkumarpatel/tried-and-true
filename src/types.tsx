export interface Recipe {
  id: string
  sourceUrl: string
  title: string
  prepTime: number
  prepTimeUnit: string
  cookTime: number
  cookTimeUnit: string
  totalTime: number
  totalTimeUnit: string
  servings: number
  mainImage?: string
  ingredients: Ingredient[]
  directions: Direction[]
  notes?: string[]
}

export interface Ingredient {
  amount: number
  amountUnit: string
  name: string
  preparation?: string
  substitutions?: string
  notes?: string
}

export interface Direction {
  instruction: string
  image?: string
}

export type RecipesRes = { recipes: Recipe[] }
export type RecipeRes = { recipe: Recipe }
