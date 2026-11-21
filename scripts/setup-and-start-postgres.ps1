$ErrorActionPreference = 'Stop'
# Disabled: the previous machine-specific script changed a local PostgreSQL cluster and contained a committed
# database credential. Rotate that credential if it was used; repository history still contains it.
throw 'This legacy setup script is disabled. Use README.md local development instructions.'
