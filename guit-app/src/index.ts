import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import user from './user/route';

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// Routes
app.route('/user', user)

const port = 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
