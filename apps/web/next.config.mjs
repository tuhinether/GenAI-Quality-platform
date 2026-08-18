/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@tickmark/db", "@tickmark/evaluators"],
};

export default nextConfig;
