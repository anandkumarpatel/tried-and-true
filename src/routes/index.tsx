import React, { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { createFileRoute } from '@tanstack/react-router'
import { Recipe, RecipeRes } from '../types'
import { useNavigate } from '@tanstack/react-router'
import './index.css'

export const Route = createFileRoute('/')({
  component: Home,
  loader: async (): Promise<{ recipes: Recipe[] }> => {
    const response = await fetch('http://localhost:3000/recipes')
    const recipes = (await response.json()) as RecipeRes
    return recipes
  },
})

function Home() {
  const { recipes } = Route.useLoaderData() as { recipes: Recipe[] }
  const [url, setUrl] = useState<string>('')
  const navigate = useNavigate()

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

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()

    try {
      const recipe = await scrape(url)
      navigate({ to: `/recipe/${recipe.id}` })
    } catch (error) {
      console.error('Error fetching recipe:', error)
    }
  }

  return (
    <div className='container'>
      <div className='input-section'>
        <h1 className='title'>Recipe Collection</h1>
        <form onSubmit={handleSubmit} className='form'>
          <label htmlFor='url' className='label'>
            Recipe URL:
          </label>
          <input type='url' id='url' name='url' value={url} onChange={(e) => setUrl(e.target.value)} required className='input' />
          <button type='submit' className='button'>
            Get Recipe
          </button>
        </form>
      </div>
      <div id='recipe-list' className='list-section'>
        <h2 className='subtitle'>All Recipes</h2>
        <ul className='recipe-list'>
          {recipes.map((recipe, index) => (
            <li key={index} className='recipe-item'>
              <div className='recipe-card'>
                <Link to={`/recipe/${recipe.id}`} className='recipe-link'>
                  <div className='recipe-content'>
                    <div className='recipe-text'>
                      <h3>{recipe.title}</h3>
                    </div>
                    {recipe.mainImage && <img src={recipe.mainImage} alt={recipe.title} width='100' className='recipe-image' />}
                  </div>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
