# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Next.js 16 breaking changes in this project

- **Middleware** is `src/proxy.js` exporting a `proxy` function — not `middleware.js`
- **`searchParams`** is a Promise — always `const { foo } = await searchParams` before use
- **`params`** is a Promise — always `const { id } = await params` in dynamic routes
- **`cookies()`** is async — always `await cookies()`
- **Inline `<script>` tags** in React components trigger a React 19 warning and do not execute on the client. Use `dangerouslySetInnerHTML` in a server component's `<head>` instead
- **`<Script strategy="beforeInteractive">`** does not support inline children in App Router — use `<script dangerouslySetInnerHTML>` in `<head>` directly
- **shadcn** uses **Base UI** (`@base-ui/react`), not Radix — `asChild` is not available on any component
