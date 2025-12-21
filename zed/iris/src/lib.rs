use std::fs;
use zed_extension_api::{self as zed, Result};

struct IrisExtension;

impl zed::Extension for IrisExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        let worktree_path = worktree.root_path();

        // Debug log to verify this function is being called and which path is used
        let log_path = format!("{}/iris-lsp-debug.log", worktree_path);
        let _ = fs::write(&log_path, "language_server_command was called\n");

        // Try multiple approaches to find and run the LSP server

        // Option 1: Use the compiled dist/src/lsp-server.js (preferred, fastest startup)
        let compiled_path = format!("{}/dist/src/lsp-server.js", worktree_path);
        if fs::metadata(&compiled_path).is_ok() {
            let _ = fs::write(&log_path, format!("LSP: using node {}\n", compiled_path));
            return Ok(zed::Command {
                command: "node".to_string(),
                args: vec![compiled_path, "--stdio".to_string()],
                env: Default::default(),
            });
        }

        // Option 2: Use the lsp-start.sh script if it exists
        let script_path = format!("{}/lsp-start.sh", worktree_path);
        if fs::metadata(&script_path).is_ok() {
            let _ = fs::write(&log_path, format!("LSP: using script {}\n", script_path));
            return Ok(zed::Command {
                command: "bash".to_string(),
                args: vec![script_path],
                env: Default::default(),
            });
        }

        // Option 3: Fallback - try npx ts-node (slower but works if not compiled)
        let lsp_path = format!("{}/src/lsp-server.ts", worktree_path);
        if fs::metadata(&lsp_path).is_ok() {
            let _ = fs::write(&log_path, format!("LSP: using npx ts-node {}\n", lsp_path));
            return Ok(zed::Command {
                command: "npx".to_string(),
                args: vec![
                    "ts-node".to_string(),
                    "--transpile-only".to_string(),
                    lsp_path,
                    "--stdio".to_string(),
                ],
                env: Default::default(),
            });
        }

        // If nothing works, return an error
        let _ = fs::write(&log_path, "LSP: no server entry point found\n");
        Err("Could not find IRIS LSP server. Please ensure the project has src/lsp-server.ts or build/lsp-server.js".into())
    }
}

zed::register_extension!(IrisExtension);
