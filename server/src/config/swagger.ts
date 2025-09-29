import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Prism Craft Studio API',
      version: '1.0.0',
      description: 'Custom apparel design and manufacturing platform API',
      contact: {
        name: 'Prism Craft Studio',
        email: 'support@prismcraftstudio.com'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.prismcraftstudio.com' 
          : `http://localhost:${process.env.PORT || 4000}`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './openapi/**/*.yaml'
  ]
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Application): void {
  // Swagger UI setup
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #2563eb }
    `,
    customSiteTitle: 'Prism Craft Studio API Documentation'
  }));

  // JSON endpoint for the spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
}

export { specs };
