import { useState, useEffect } from 'react'
import './App.css'

export interface Recipe {
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

function App() {
  const [url, setUrl] = useState('')
  const [recipe, setRecipe] = useState<Recipe>()
  const [recipes, setRecipes] = useState<Recipe[]>([])

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const response = await fetch('http://localhost:3000/recipes')
        const data = await response.json()
        setRecipes(data.recipes)
      } catch (error) {
        console.error('Error fetching recipes:', error)
      }
    }

    fetchRecipes()
  }, [])

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()

    try {
      const recipe = await scrape(url)
      setRecipe(recipe)
    } catch (error) {
      console.error('Error fetching recipe:', error)
    }
  }

  const scrape = async (url: string): Promise<Recipe> => {
    try {
      const response = await fetch('http://localhost:3000/scrape', {
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

  const displayRecipe = (recipe: Recipe) => {
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

  return (
    <div>
      <h1>Recipe Collection</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor='url'>Recipe URL:</label>
        <input type='url' id='url' name='url' value={url} onChange={(e) => setUrl(e.target.value)} required />
        <button type='submit'>Get Recipe</button>
      </form>
      <div id='recipe-display'>{recipe && displayRecipe(recipe)}</div>
      <div id='recipe-list'>
        <h2>All Recipes</h2>
        <ul>
          {recipes.map((recipe, index) => (
            <li key={index}>
              <h3>{recipe.title}</h3>
              {recipe.mainImage && <img src={recipe.mainImage} alt={recipe.title} width='100' />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default App
