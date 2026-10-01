const W = 160
const H = 48
const handleR = 2

const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag)
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
  return el
}

const handleXY = (n, side) =>
  ({
    bottom: [n.x + W / 2, n.y + H],
    left: [n.x, n.y + H / 2],
    right: [n.x + W, n.y + H / 2],
    top: [n.x + W / 2, n.y],
  })[side]

const resolveColor = (n, colors) => {
  if (!n.color) return null
  return colors?.[n.color] || n.color
}

const renderFlow = (flow, { colors } = {}) => {
  const section = document.querySelector('main').appendChild(document.createElement('section'))
  section.appendChild(document.createElement('h2')).textContent = flow.title

  const hasDetails = flow.nodes.some(n => n.detail)
  const hasMultiline = flow.nodes.some(n => n.detail?.includes('\n'))
  let row, main, sideHeading, sideContent, selectedIndex, select

  if (hasDetails) {
    row = section.appendChild(document.createElement('div'))
    row.className = 'flow'
    main = row.appendChild(document.createElement('div'))
    main.className = 'flow-main'
  }

  const svg = (main || section).appendChild(svgEl('svg'))
  const edgeLayer = svg.appendChild(svgEl('g'))
  const nodeLayer = svg.appendChild(svgEl('g'))
  const handleLayer = svg.appendChild(svgEl('g'))
  const boxes = Object.fromEntries(flow.nodes.map(n => [n.id, n]))
  const rects = {}
  const nodeIds = flow.nodes.map(n => n.id)

  if (hasMultiline) {
    const side = row.appendChild(document.createElement('aside'))
    side.className = 'flow-side'
    const card = side.appendChild(document.createElement('div'))
    card.className = 'card'
    sideHeading = card.appendChild(document.createElement('h3'))
    const sideFilename = card.appendChild(document.createElement('p'))
    sideContent = card.appendChild(document.createElement('pre'))
    selectedIndex = 0

    select = i => {
      selectedIndex = Math.max(0, Math.min(i, nodeIds.length - 1))
      const id = nodeIds[selectedIndex]
      nodeIds.forEach(nid => {
        const base = (rects[nid].getAttribute('class') || '').replace(' selected', '')
        rects[nid].setAttribute('class', nid === id ? `${base} selected` : base)
      })
      sideHeading.textContent = boxes[id].label
      const detail = boxes[id].detail || ''
      const split = detail.indexOf('\n')
      sideFilename.textContent = split > -1 ? detail.substring(0, split) : ''
      sideContent.textContent = split > -1 ? detail.substring(split + 1) : detail
    }
  } else if (hasDetails) {
    const side = row.appendChild(document.createElement('aside'))
    side.className = 'flow-side'
    const list = side.appendChild(document.createElement('ul'))
    flow.nodes
      .filter(n => n.detail)
      .forEach(n => {
        const li = list.appendChild(document.createElement('li'))
        const strong = li.appendChild(document.createElement('strong'))
        strong.textContent = n.label
        li.appendChild(document.createTextNode(` → ${n.detail}`))
      })
  }

  flow.nodes.forEach(n => {
    const fill = resolveColor(n, colors)
    const rect = fill
      ? nodeLayer.appendChild(svgEl('rect', { fill, height: H - 1, rx: 4, width: W - 1, x: n.x + 0.5, y: n.y + 0.5 }))
      : nodeLayer.appendChild(
          svgEl('rect', {
            class: 'node-box',
            fill: '#fff',
            height: H - 1,
            rx: 4,
            width: W - 1,
            x: n.x + 0.5,
            y: n.y + 0.5,
          }),
        )
    rects[n.id] = rect
    const fo = nodeLayer.appendChild(
      svgEl(
        'foreignObject',
        hasDetails
          ? { class: 'clickable', height: H, width: W, x: n.x, y: n.y }
          : { height: H, width: W, x: n.x, y: n.y },
      ),
    )
    const label = fo.appendChild(document.createElement('div'))
    label.className = 'node-label'
    label.appendChild(document.createTextNode(n.label))
    if (n.icon) {
      const icon = label.appendChild(document.createElement('i'))
      icon.className = `${n.icon} node-icon`
      icon.title = n.iconTitle || ''
    }
    if (select) fo.addEventListener('click', () => select(nodeIds.indexOf(n.id)))
  })

  flow.edges.forEach(e => {
    const s = boxes[e.source]
    const t = boxes[e.target]
    const sourcePosition = s.source || 'bottom'
    const targetPosition = t.target || 'top'
    const [sourceX, sourceY] = handleXY(s, sourcePosition)
    const [targetX, targetY] = handleXY(t, targetPosition)
    const [d, labelX, labelY] = getSmoothStepPath({
      sourcePosition,
      sourceX,
      sourceY,
      targetPosition,
      targetX,
      targetY,
    })
    edgeLayer.appendChild(svgEl('path', { class: 'edge', d }))
    handleLayer.appendChild(svgEl('circle', { class: 'handle', cx: sourceX, cy: sourceY, r: handleR }))
    handleLayer.appendChild(svgEl('circle', { class: 'handle', cx: targetX, cy: targetY, r: handleR }))
    if (e.label)
      edgeLayer.appendChild(svgEl('text', { class: 'edge-label', x: labelX, y: labelY })).textContent = e.label
  })

  const svgW = Math.max(...flow.nodes.map(n => n.x)) + W
  const svgH = Math.max(...flow.nodes.map(n => n.y)) + H
  svg.setAttribute('width', svgW)
  svg.setAttribute('height', svgH)
  svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`)

  if (select) {
    select(selectedIndex)
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        select(selectedIndex + 1)
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        select(selectedIndex - 1)
      }
    })
  }
}
