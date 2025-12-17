---
trigger: always_on
---

Keep project root directory tidy
--
Only allow README.md of .md files there. For all other .md files scan if they are still valid, if an .md file is not valid move it to old-directory.

If an .md file is valid, find best location for the file. You can ask the user if unsure.
