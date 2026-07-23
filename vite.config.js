import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    // Usamos Terser para minificación y ofuscación
    minify: 'terser',

    terserOptions: {
      compress: {
        // Elimina todos los console.*
        drop_console: true,
        // Elimina statements de depuración (debugger;)
        drop_debugger: true,
        // Inline de funciones pequeñas para dificultar la lectura
        inline: 2,
        // Ofusca el flujo de control
        passes: 3,
      },
      mangle: {
        // Acorta nombres de variables y funciones a caracteres mínimos
        toplevel: true,
        // Ofusca propiedades de objetos (más agresivo)
        properties: {
          // Solo ofusca propiedades que empiecen con _ (privadas)
          // Cambiá a regex: /.*/ para ofuscar TODAS (más agresivo pero puede romper librerías)
          regex: /^_/,
        },
      },
      format: {
        // Elimina todos los comentarios del código
        comments: false,
      },
    },

    rollupOptions: {
      output: {
        // Nombres de chunks con hash para evitar caché
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
        // Separar vendor de tu código (mejor performance + ofuscación separada)
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
  },
})