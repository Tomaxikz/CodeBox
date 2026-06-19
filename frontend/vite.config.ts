import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),

    // React Compiler
    babel({
      presets: [reactCompilerPreset()],
    }),

    tailwindcss(),
  ],

  build: {
    outDir: './dist',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1024,

    rolldownOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',

        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: 'router',
              test: /node_modules[\\/](react-router|react-router-dom)[\\/]/,
              priority: 25,
            },
            {
              name: 'charts',
              test: /node_modules[\\/](recharts|@mantine[\\/]charts|chart\.js|d3|echarts)[\\/]/,
              priority: 20,
            },
            {
              name: 'ui',
              test: /node_modules[\\/](@mantine|@mui|antd|@chakra-ui|@radix-ui|lucide-react|framer-motion)[\\/]/,
              priority: 15,
            },
            {
              name: 'vendor',
              test: /node_modules/,
              priority: 10,
              minSize: 20_000,
            },
            {
              name: 'common',
              minShareCount: 3,
              minSize: 10_240,
              priority: 5,
            },
          ],
        },
      },
    },
  },
})