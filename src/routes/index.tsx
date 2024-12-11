import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import React, { useState } from 'react'
import { listRecipes, scrape } from '../services/backend'
import './index.css'

export const Route = createFileRoute('/')({
  component: Home,
  loader: listRecipes,
})

function Home() {
  const recipes = Route.useLoaderData()
  const [url, setUrl] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const navigate = useNavigate()

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (loading) return
    if (!url) return alert('Please enter a URL')

    setLoading(true)

    try {
      const recipe = await scrape(url)
      navigate({ to: `/recipe/${recipe.id}` })
    } catch (error) {
      console.error('Error fetching recipe:', error)
      alert('Error saving recipe, try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='container'>
      <div className='input-section'>
        <h1 className='title'>Tried & True</h1>
        <form onSubmit={handleSubmit} className='form'>
          <div>
            <label htmlFor='url' className='label'>
              Recipe URL:
            </label>
            <input type='url' id='url' name='url' value={url} onChange={(e) => setUrl(e.target.value)} required className='input' />
          </div>
          <button type='submit' className='button' disabled={loading}>
            {loading ? 'Loading...' : 'Get Recipe'}
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
                    {recipe.mainImage && <img src={recipe.mainImage} alt={recipe.title} width='100' className='recipe-image' />}
                    <div className='recipe-text'>
                      <h3>{recipe.title}</h3>
                    </div>
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
