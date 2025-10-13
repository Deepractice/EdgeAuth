// vitest.config.ts
import { defineConfig } from "file:///Users/sean/Deepractice/projects/EdgeAuth/node_modules/.pnpm/vitest@3.2.4_@types+node@22.18.10_@vitest+ui@3.2.4/node_modules/vitest/dist/config.js";
import { vitestCucumber } from "file:///Users/sean/Deepractice/projects/EdgeAuth/node_modules/.pnpm/@deepracticex+vitest-cucumber-plugin@1.1.1_vitest@3.2.4/node_modules/@deepracticex/vitest-cucumber-plugin/dist/index.js";
import { resolve } from "path";
var __vite_injected_original_dirname =
  "/Users/sean/Deepractice/projects/EdgeAuth/services/admin-worker";
var vitest_config_default = defineConfig({
  plugins: [vitestCucumber()],
  test: {
    include: ["**/*.feature"],
  },
  resolve: {
    alias: {
      "edge-auth-domain": resolve(
        __vite_injected_original_dirname,
        "../../src/domain/index.ts",
      ),
      "edge-auth-core": resolve(
        __vite_injected_original_dirname,
        "../../src/core/index.ts",
      ),
    },
  },
});
export { vitest_config_default as default };
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9zZWFuL0RlZXByYWN0aWNlL3Byb2plY3RzL0VkZ2VBdXRoL3NlcnZpY2VzL2FkbWluLXdvcmtlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3NlYW4vRGVlcHJhY3RpY2UvcHJvamVjdHMvRWRnZUF1dGgvc2VydmljZXMvYWRtaW4td29ya2VyL3ZpdGVzdC5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3NlYW4vRGVlcHJhY3RpY2UvcHJvamVjdHMvRWRnZUF1dGgvc2VydmljZXMvYWRtaW4td29ya2VyL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZXN0L2NvbmZpZ1wiO1xuaW1wb3J0IHsgdml0ZXN0Q3VjdW1iZXIgfSBmcm9tIFwiQGRlZXByYWN0aWNleC92aXRlc3QtY3VjdW1iZXItcGx1Z2luXCI7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSBcInBhdGhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3ZpdGVzdEN1Y3VtYmVyKCldLFxuICB0ZXN0OiB7XG4gICAgaW5jbHVkZTogW1wiKiovKi5mZWF0dXJlXCJdLFxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiZWRnZS1hdXRoLWRvbWFpblwiOiByZXNvbHZlKF9fZGlybmFtZSwgXCIuLi8uLi9zcmMvZG9tYWluL2luZGV4LnRzXCIpLFxuICAgICAgXCJlZGdlLWF1dGgtY29yZVwiOiByZXNvbHZlKF9fZGlybmFtZSwgXCIuLi8uLi9zcmMvY29yZS9pbmRleC50c1wiKSxcbiAgICB9LFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW1YLFNBQVMsb0JBQW9CO0FBQ2haLFNBQVMsc0JBQXNCO0FBQy9CLFNBQVMsZUFBZTtBQUZ4QixJQUFNLG1DQUFtQztBQUl6QyxJQUFPLHdCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsZUFBZSxDQUFDO0FBQUEsRUFDMUIsTUFBTTtBQUFBLElBQ0osU0FBUyxDQUFDLGNBQWM7QUFBQSxFQUMxQjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsb0JBQW9CLFFBQVEsa0NBQVcsMkJBQTJCO0FBQUEsTUFDbEUsa0JBQWtCLFFBQVEsa0NBQVcseUJBQXlCO0FBQUEsSUFDaEU7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
