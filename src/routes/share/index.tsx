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
  const needsRedirect = window.location.search && window.location.hash.endsWith('/share')

  const finalUrl = [url, text, title].find((param) => {
    try {
      return param && new URL(param)
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (needsRedirect) return
    if (!finalUrl || !loading) {
      setTimeout(() => navigate({ to: '/' }), 5000)
      return
    }
    const controller = new AbortController()
    scrape(finalUrl, controller)
      .then((recipe) => {
        navigate({ to: `/recipe/${recipe.id}`, search: {} })
      })
      .catch((error) => {
        console.error('Error creating recipe:', error)
        alert('Error saving recipe, try again')
      })
      .finally(() => {
        setLoading(false)
      })

    return () => controller.abort('effect done')
  }, [finalUrl, navigate, loading, needsRedirect])

  if (needsRedirect) {
    window.location.replace(window.location.pathname + window.location.hash + window.location.search)
    return null
  }
  if (!finalUrl) return <div className='container'>Sharing failed, returning to home page...</div>
  if (!loading) return <div className='container'>error loading recipe from {finalUrl}, returning to home page..</div>
  return <div className='container'>loading recipe from {finalUrl}</div>
}
