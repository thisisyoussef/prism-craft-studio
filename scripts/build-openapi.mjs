#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerJsdoc from 'swagger-jsdoc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '..');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Prism Craft Studio API',
      version: '1.0.0',
      description: 'Custom apparel design and manufacturing platform API'
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://api.prismcraftstudio.com'
          : 'http://localhost:4000',
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
  apis: [path.join(root, 'server/openapi/**/*.yaml')]
};

const specs = swaggerJsdoc(options);
const outPath = path.join(root, 'openapi.json');
fs.writeFileSync(outPath, JSON.stringify(specs, null, 2));
console.log(`OpenAPI spec written to ${outPath}`);
