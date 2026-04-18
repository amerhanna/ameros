import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            {
              "group": ["@/lib/database", "@/lib/vfs", "@/lib/registry", "@/lib/*"],
              "message": "SECURITY VIOLATION: Userland applications cannot import OS Kernel services directly. Use the appropriate hooks (e.g., useDatabase) instead."
            }
          ]
        }
      ]
    }
  },
  {
    // Exempt kernel/system directories and the DBExplorer utility from this rule
    files: ["components/WindowManager/**/*", "lib/**/*", "hooks/**/*", "app/**/*", "Applications/DBExplorer/**/*"],
    rules: {
      "no-restricted-imports": "off"
    }
  }
]);

export default eslintConfig;
