// src/components/player/CopyrightNotice.tsx -- Subtle copyright notice (PROT-04)
// Rendered below player controls and in BaseLayout footer

import React from 'react'

export function CopyrightNotice() {
  return (
    <p className="text-xs text-text-secondary/50 text-center mt-3 select-none">
      &copy; 2026 Luis Mogrovejo. All rights reserved.
    </p>
  )
}
