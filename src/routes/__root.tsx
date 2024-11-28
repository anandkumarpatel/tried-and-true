import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import './root.css'

export const Route = createRootRoute({
  component: () => (
    <>
      <div className='glass-card'>
        <Link to='/' className='link'>
          Home
        </Link>{' '}
      </div>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
})
