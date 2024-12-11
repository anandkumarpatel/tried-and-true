import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { scrape } from '../../services/backend'
import './index.css'

type SearchParams = {
  title?: string
  text?: string
  url?: string
}

export const Route = createFileRoute('/share/')({
  component: Share,
  validateSearch: (search: SearchParams): SearchParams => {
    return search
  },
})

function Share() {
  const { title, text, url } = Route.useSearch()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  const finalUrl = url || text || title

  useEffect(() => {
    if (!finalUrl || !loading) {
      setTimeout(() => navigate({ to: '/' }), 3000)
      return
    }
    scrape(finalUrl)
      .then((recipe) => {
        navigate({ to: `/recipe/${recipe.id}` })
      })
      .catch((error) => {
        console.error('Error creating recipe:', error)
        alert('Error saving recipe, try again')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [finalUrl, navigate, loading])

  if (!finalUrl) return <div className='container'>Sharing failed, returning to home page...</div>
  if (!loading) return <div className='container'>error loading recipe from {finalUrl}, returning to home page..</div>
  return <div className='container'>loading recipe from {finalUrl}</div>
}
