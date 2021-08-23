import fastify from 'fastify'

const server = fastify()

export default async (url) =>
  new Promise(async (resolve, reject) => {
    server.get('/', (request, reply) => {
      const code = request.query.code
      if (code) {
        reply
          .type('text/html')
          .send(
            `<script>alert('Success! Please go back to your terminal!')</script>`,
          )
        resolve(code)
      }
      reject()
    })
    await server.listen(parseInt(url) || 3000)
  })
