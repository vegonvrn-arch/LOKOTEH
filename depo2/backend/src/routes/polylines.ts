import { Router, Response } from 'express'
import pool from '../db/connection.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router({ mergeParams: true })

// Middleware to verify project ownership
async function verifyProjectOwnership(req: AuthRequest, res: Response, next: any) {
  try {
    const userId = req.userId
    const { projectId } = req.params

    const result = await pool.query('SELECT user_id FROM projects WHERE id = $1', [projectId])

    if (result.rows.length === 0 || result.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    next()
  } catch (error) {
    res.status(500).json({ error: 'Authorization failed' })
  }
}

// Get all polylines for a project
router.get('/', authMiddleware, verifyProjectOwnership, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params

    const result = await pool.query(
      `SELECT id, label, description, color, stroke_width as "strokeWidth", dash_style as "dashStyle", points
       FROM polylines WHERE project_id = $1 ORDER BY created_at`,
      [projectId]
    )

    res.json({ polylines: result.rows })
  } catch (error) {
    console.error('Get polylines error:', error)
    res.status(500).json({ error: 'Failed to fetch polylines' })
  }
})

// Create new polyline
router.post('/', authMiddleware, verifyProjectOwnership, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params
    const { id, label, description, color, strokeWidth, dashStyle, points } = req.body

    if (!label || !points || !Array.isArray(points)) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const result = await pool.query(
      `INSERT INTO polylines (project_id, id, label, description, color, stroke_width, dash_style, points)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, label, description, color, stroke_width as "strokeWidth", dash_style as "dashStyle", points`,
      [projectId, id, label, description || '', color || 'cyan', strokeWidth || 1, dashStyle || 'solid', JSON.stringify(points)]
    )

    const polyline = result.rows[0]
    polyline.points = JSON.parse(polyline.points)

    res.status(201).json({
      message: 'Polyline created successfully',
      polyline,
    })
  } catch (error) {
    console.error('Create polyline error:', error)
    res.status(500).json({ error: 'Failed to create polyline' })
  }
})

// Update polyline
router.put('/:polylineId', authMiddleware, verifyProjectOwnership, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, polylineId } = req.params
    const { label, description, color, strokeWidth, dashStyle, points } = req.body

    // Verify polyline exists and belongs to project
    const checkResult = await pool.query(
      'SELECT id FROM polylines WHERE id = $1 AND project_id = $2',
      [polylineId, projectId]
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Polyline not found' })
    }

    const result = await pool.query(
      `UPDATE polylines SET
        label = COALESCE($1, label),
        description = COALESCE($2, description),
        color = COALESCE($3, color),
        stroke_width = COALESCE($4, stroke_width),
        dash_style = COALESCE($5, dash_style),
        points = COALESCE($6, points),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, label, description, color, stroke_width as "strokeWidth", dash_style as "dashStyle", points`,
      [label || null, description || null, color || null, strokeWidth ?? null, dashStyle || null, points ? JSON.stringify(points) : null, polylineId]
    )

    const polyline = result.rows[0]
    polyline.points = JSON.parse(polyline.points)

    res.json({
      message: 'Polyline updated successfully',
      polyline,
    })
  } catch (error) {
    console.error('Update polyline error:', error)
    res.status(500).json({ error: 'Failed to update polyline' })
  }
})

// Delete polyline
router.delete('/:polylineId', authMiddleware, verifyProjectOwnership, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, polylineId } = req.params

    // Verify polyline exists and belongs to project
    const checkResult = await pool.query(
      'SELECT id FROM polylines WHERE id = $1 AND project_id = $2',
      [polylineId, projectId]
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Polyline not found' })
    }

    await pool.query('DELETE FROM polylines WHERE id = $1', [polylineId])

    res.json({
      message: 'Polyline deleted successfully',
    })
  } catch (error) {
    console.error('Delete polyline error:', error)
    res.status(500).json({ error: 'Failed to delete polyline' })
  }
})

export default router
