import React, { useMemo } from 'react'

export function MarkdownText({ text, style }: { text: string; style?: React.CSSProperties }) {
  const html = useMemo(() => toHtml(text || ''), [text])
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '5px', ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fmtInline(raw: string): string {
  let s = esc(raw)
  // bold **text** — use a simple split approach, no regex
  const parts: string[] = s.split('**')
  if (parts.length >= 3) {
    let result = ''
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        // odd index = bold content
        result += '<b style="color:#e2e8f0;font-weight:700">' + parts[i] + '</b>'
      } else {
        result += parts[i]
      }
    }
    s = result
  }
  // inline code `text`
  const codeParts = s.split('`')
  if (codeParts.length >= 3) {
    let result = ''
    for (let i = 0; i < codeParts.length; i++) {
      if (i % 2 === 1) {
        result += '<code style="background:#1a2332;padding:1px 4px;border-radius:3px;font-size:0.9em;color:#00d4ff">' + codeParts[i] + '</code>'
      } else {
        result += codeParts[i]
      }
    }
    s = result
  }
  return s
}

function toHtml(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []

  for (const raw of lines) {
    const t = raw.trim()
    if (!t) {
      out.push('<div style="height:4px"></div>')
      continue
    }

    // horizontal rule
    if (/^-{3,}$/.test(t)) {
      out.push('<hr style="border:none;border-top:1px solid #1a2744;margin:4px 0"/>')
      continue
    }

    // heading ### ## #
    const hm = t.match(/^(#{1,3})\s+(.+)$/)
    if (hm) {
      const lvl = hm[1].length
      const sizes = ['13px', '12px', '11px']
      const colors = ['#00d4ff', '#a78bfa', '#f5c542']
      const bb = lvl === 1 ? 'border-bottom:1px solid #1a2744;padding-bottom:3px;' : ''
      out.push('<div style="font-size:' + sizes[lvl-1] + ';font-weight:700;color:' + colors[lvl-1] + ';letter-spacing:0.04em;margin-top:6px;' + bb + '">' + fmtInline(hm[2]) + '</div>')
      continue
    }

    // numbered list
    const nm = t.match(/^(\d+)[.)]\s+(.+)$/)
    if (nm) {
      out.push('<div style="display:flex;gap:6px;padding-left:4px"><span style="color:#4a5568;font-weight:700;flex-shrink:0;min-width:16px">' + nm[1] + '.</span><span style="line-height:1.55">' + fmtInline(nm[2]) + '</span></div>')
      continue
    }

    // bullet: - text or • text (not * to avoid **bold** conflict)
    const bm = t.match(/^[-•]\s+(.+)$/)
    if (bm) {
      out.push('<div style="display:flex;gap:6px;padding-left:6px;align-items:baseline"><span style="color:#4a5568;flex-shrink:0;width:8px">•</span><span style="line-height:1.55">' + fmtInline(bm[1]) + '</span></div>')
      continue
    }

    // paragraph
    out.push('<div style="line-height:1.55">' + fmtInline(t) + '</div>')
  }

  return out.join('')
}
