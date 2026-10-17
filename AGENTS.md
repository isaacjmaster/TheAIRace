# The AI Race development previews

- Open every agent-driven game preview or screenshot URL with `?testAudio=off` (or append `&testAudio=off` to an existing query). This suppresses music and effects without writing the player mute preference. Forward the flag into any iframe used for viewport testing.
- Standard automated browsers with `navigator.webdriver === true` are automatically silent as a second safeguard. For browser automation that does not advertise webdriver, set the URL flag before loading or interacting with the game.
- Close agent-created game test tabs/contexts when verification finishes, including on failures. For scripted browser suites, use `try/finally` to close contexts and browsers. Do not retain a test tab merely to deliver a screenshot; save the screenshot to a local artifact instead. Keep a preview open only when the user specifically asks for it, and retain the mute flag.
- Do not change localStorage audio preferences to silence tests. Do not modify the soundtrack or production defaults for test convenience.
- Tests and previews use isolated databases. Preserve production data and unrelated projects.
