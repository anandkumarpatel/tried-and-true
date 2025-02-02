import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import './root.css'

export const Route = createRootRoute({
  component: () => (
    <>
      <div className='navbar'>
        <Link to='/' className='link'>
          Home
        </Link>{' '}
      </div>
      <Outlet />
      {window.location.hostname === 'localhost' && <TanStackRouterDevtools />}
    </>
  ),
})
