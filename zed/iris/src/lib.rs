use zed_extension_api::{self as zed, Result};

struct IrisExtension;

impl zed::Extension for IrisExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        // Use npx ts-node to run our TypeScript LSP server
        Ok(zed::Command {
            command: "npx".to_string(),
            args: vec![
                "ts-node".to_string(),
                "src/lsp-server.ts".to_string(),
                "--stdio".to_string(),
            ],
            env: Default::default(),
        })
    }
}

zed::register_extension!(IrisExtension);
