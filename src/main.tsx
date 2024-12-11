import { RouterProvider, createRouter, createHashHistory } from '@tanstack/react-router'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { routeTree } from './routeTree.gen'

const hashHistory = createHashHistory()
// Create a new router instance
const router = createRouter({
  routeTree,
  history: hashHistory,
  defaultNotFoundComponent: () => {
    const queryParams = new URLSearchParams(window.location.search)
    const text = queryParams.get('text') || 'No text provided'
    const url = queryParams.get('url') || 'No URL provided'
    const title = queryParams.get('title') || 'No title provided'
    return (
      <div>
        <div>
          <p>Text: {text}</p>
          <p>URL: {url}</p>
          <p>Title: {title}</p>
          <p>Full Current URL: {window.location.href}</p>
        </div>
      </div>
    )
  },
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

if (window.location.search) {
  window.location.replace(window.location.pathname + window.location.hash + window.location.search)
}

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
} else {
  console.error('Root element is not empty. This may cause issues.')
}
