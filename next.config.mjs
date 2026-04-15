/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Force transpilation of these packages to handle raw TS/Flow syntax
  transpilePackages: ["react-native-fs", "react-native", "alasql"],

  turbopack: {
    resolveAlias: {
      "react-native-fs": "./empty.js",
      "react-native-fetch-blob": "./empty.js",
      "react-native": "./empty.js",
      "fs": "./empty.js",
      "path": "./empty.js",
      "os": "./empty.js",
      "crypto": "./empty.js",
    },
  },

  webpack: (config) => {
    // This forces Webpack to replace these modules with an empty object
    config.resolve.alias = {
      ...config.resolve.alias,
      "react-native-fs": false,
      "react-native-fetch-blob": false,
      "react-native": false,
    };

    // Standard fallbacks for Node.js modules in the browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
    };

    return config;
  },
};

export default nextConfig;
