import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <p className="font-mono text-sm text-brand">404</p>
      <h1 className="mt-2 text-3xl font-bold">Nothing drawn here</h1>
      <p className="mt-3 text-muted-foreground">No seed leads to this page. Try the docs instead.</p>
      <Button asChild className="mt-6">
        <Link to="/docs">Go to the docs</Link>
      </Button>
    </div>
  )
}
