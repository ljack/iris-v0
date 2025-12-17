---
description: Verify project build and platform consistency
---

To ensure that the project builds correctly and that all platform implementations (Node.js and Browser) remain consistent with core interfaces like `INetwork`, follow these steps:

1.  **Run the Build**: Execute the TypeScript compiler to catch type errors and missing interface implementations.
    // turbo
    ```bash
    npm run build
    ```

2.  **Verify Platform implementations**:
    If the build fails with "incorrectly implements interface 'INetwork'", it means a new method was added to `INetwork` (like `connect`) but not implemented in `BrowserNetwork` (in `src/platform/browser.ts`) or `NodeNetwork` (in `src/cli.ts`).
    
    *   **Action**: Implement the missing method in the failing class. For `BrowserNetwork`, it is usually sufficient to log a warning and return a default value (e.g., `null` or `false`) if the feature is not supported in the browser.

3.  **Verify `bin/iris`**:
    Ensure the CLI tool works after the build.
    // turbo
    ```bash
    bin/iris --help
    ```
