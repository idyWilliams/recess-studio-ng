import { FlatCompat } from '@eslint/eslintrc';
import base from '@recess/config/eslint';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  // Ignore Next.js auto-generated files
  { ignores: ['next-env.d.ts', '.next/**'] },
  ...base,
  ...compat.extends('next/core-web-vitals'),
];
