import { Outlet } from 'react-router'
import { OnThisPage } from './OnThisPage'
import { Pager } from './Pager'
import { SidebarNav } from './SidebarNav'

export function DocsLayout() {
  return (
    <div className="mx-auto flex max-w-screen-2xl px-4 sm:px-6">
      <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r py-8 pr-4 lg:block">
        <SidebarNav />
      </aside>
      <main className="min-w-0 flex-1 py-10 lg:px-12">
        <article data-article className="mx-auto max-w-3xl">
          <Outlet />
          <Pager />
        </article>
      </main>
      <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-56 shrink-0 overflow-y-auto py-10 xl:block">
        <OnThisPage />
      </aside>
    </div>
  )
}
