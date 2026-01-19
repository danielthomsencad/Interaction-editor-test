/**
 * Geometry utility functions for collision detection and spatial calculations
 */

/**
 * Check if a point is inside a polygon element
 * @param {number} x - X coordinate of the point
 * @param {number} y - Y coordinate of the point
 * @param {Object} element - Polygon element with x, y, and vertices array
 * @returns {boolean} - True if point is inside the polygon
 */
export const isPointInPolygon = (x, y, element) => {
  const vertices = element.vertices.map((v) => ({
    x: element.x + v.x,
    y: element.y + v.y,
  }))

  let inside = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    if (
      vertices[i].y > y !== vertices[j].y > y &&
      x <
        ((vertices[j].x - vertices[i].x) * (y - vertices[i].y)) / (vertices[j].y - vertices[i].y) +
          vertices[i].x
    ) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Check if a point is inside a polygon using pre-transformed vertices
 * @param {number} x - X coordinate of the point
 * @param {number} y - Y coordinate of the point
 * @param {Array} vertices - Array of vertices with absolute x, y coordinates
 * @returns {boolean} - True if point is inside the polygon
 */
export const isPointInPolygonVertices = (x, y, vertices) => {
  let inside = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    if (
      vertices[i].y > y !== vertices[j].y > y &&
      x <
        ((vertices[j].x - vertices[i].x) * (y - vertices[i].y)) / (vertices[j].y - vertices[i].y) +
          vertices[i].x
    ) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Check if a point is inside a bounding box
 * @param {number} x - X coordinate of the point
 * @param {number} y - Y coordinate of the point
 * @param {Object} element - Element with boundingBox property
 * @returns {boolean} - True if point is inside the bounding box
 */
export const isPointInBoundingBox = (x, y, element) => {
  if (!element.boundingBox) return false
  const { minX, maxX, minY, maxY } = element.boundingBox
  return x >= minX && x <= maxX && y >= minY && y <= maxY
}

/**
 * Check if two line segments intersect
 * @param {Object} line1 - First line with x1, y1, x2, y2 properties
 * @param {Object} line2 - Second line with x1, y1, x2, y2 properties
 * @returns {boolean} - True if lines intersect
 */
export const doLinesIntersect = (line1, line2) => {
  const { x1: x1, y1: y1, x2: x2, y2: y2 } = line1
  const { x1: x3, y1: y3, x2: x4, y2: y4 } = line2

  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (denominator === 0) return false // Lines are parallel

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator

  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

/**
 * Check if a polygon intersects with a rectangle
 * @param {Object} element - Polygon element with x, y, and vertices array
 * @param {number} minX - Rectangle minimum X
 * @param {number} minY - Rectangle minimum Y
 * @param {number} maxX - Rectangle maximum X
 * @param {number} maxY - Rectangle maximum Y
 * @returns {boolean} - True if polygon intersects with rectangle
 */
export const isPolygonIntersectingRectangle = (element, minX, minY, maxX, maxY) => {
  // Convert element vertices to absolute coordinates
  const vertices = element.vertices.map((v) => ({
    x: element.x + v.x,
    y: element.y + v.y,
  }))

  // 1. Check if any vertex is inside the selection rectangle
  const hasVertexInside = vertices.some(
    (vertex) => vertex.x >= minX && vertex.x <= maxX && vertex.y >= minY && vertex.y <= maxY,
  )

  if (hasVertexInside) return true

  // 2. Check if any rectangle corner is inside the polygon
  const rectCorners = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ]

  const hasCornerInside = rectCorners.some((corner) => {
    return isPointInPolygonVertices(corner.x, corner.y, vertices)
  })

  if (hasCornerInside) return true

  // 3. Check if any polygon edge intersects with rectangle edges
  const rectEdges = [
    { x1: minX, y1: minY, x2: maxX, y2: minY }, // top
    { x1: maxX, y1: minY, x2: maxX, y2: maxY }, // right
    { x1: maxX, y1: maxY, x2: minX, y2: maxY }, // bottom
    { x1: minX, y1: maxY, x2: minX, y2: minY }, // left
  ]

  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length
    const polygonEdge = {
      x1: vertices[i].x,
      y1: vertices[i].y,
      x2: vertices[j].x,
      y2: vertices[j].y,
    }

    for (const rectEdge of rectEdges) {
      if (doLinesIntersect(polygonEdge, rectEdge)) {
        return true
      }
    }
  }

  return false
}
