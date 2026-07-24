'use client'

/**
 * Admin-only "delete user" button. Confirms with a simple dialog, then submits the
 * `deleteUser` server action (which removes the auth account and cascades all their
 * data). On the detail page pass `redirectOnDone` so a successful delete navigates back
 * to /admin (the current page would otherwise 404); on the list the revalidate is enough.
 */
import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2Icon } from 'lucide-react'
import { deleteUser } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'

export function AdminDeleteUserButton({ userId, name, redirectOnDone = false }) {
  const [state, formAction, pending] = useActionState(deleteUser, null)
  const router = useRouter()

  useEffect(() => {
    if (state?.ok && redirectOnDone) router.push('/admin')
  }, [state, redirectOnDone, router])

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Delete ${name} and all their data? This cannot be undone.`)) {
          e.preventDefault()
        }
      }}
      className="inline-flex items-center gap-2"
    >
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        <Trash2Icon /> {pending ? 'Deleting…' : 'Delete'}
      </Button>
      {state?.error && <span className="text-destructive text-xs">{state.error}</span>}
    </form>
  )
}
