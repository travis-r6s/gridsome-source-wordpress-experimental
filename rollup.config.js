export default {
  input: 'src/index.js',
  output: {
    file: 'lib/index.js',
    format: 'cjs',
    exports: 'default'
  },
  external: ['got', 'graphql', 'graphql-tools', 'consola']
}
