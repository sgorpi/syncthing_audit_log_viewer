# Syncthing Audit Log File Viewer

A simple static webpage to parse and view your [SyncThing](https://syncthing.net/) audit logs within your browser.

## [Try it online](https://html-preview.github.io/?url=https://github.com/sgorpi/syncthing_audit_log_viewer/blob/main/index.html)

To enable audit logs, run syncthing with `syncthing --audit` (see SyncThing's [command line options](https://docs.syncthing.net/users/syncthing.html#cmdoption-audit)),
or add `<auditEnabled>true</auditEnabled>` to the `<options>` of your [config.xml](https://docs.syncthing.net/users/config.html#config-option-options.auditenabled).

Audit logs can typically be found in 
`$XDG_STATE_HOME/syncthing` or `$HOME/.local/state/syncthing` (Unix-like),
`$HOME/Library/Application Support/Syncthing` (Mac), 
or `%LOCALAPPDATA%\Syncthing` (Windows).
