import { Hono } from 'hono'
import user from './user/route';

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// Routes
app.route('/user', user)

export default app;