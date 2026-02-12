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

// Get all segments for a project
router.get('/', authMiddleware, verifyProjectOwnership, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params

    const result = await pool.query(
      'SELECT id, code, title, details, top, left, width, height, color FROM segments WHERE project_id = $1 ORDER BY created_at',
      [projectId]
    )

    res.json({ segments: result.rows })
  } catch (error) {
    console.error('Get segments error:', error)
    res.status(500).json({ error: 'Failed to fetch segments' })
  }
})

// Create new segment
router.post('/', authMiddleware, verifyProjectOwnership, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params
    const { id, code, title, details, top, left, width, height, color } = req.body

    if (!code || top === undefined || left === undefined || width === undefined || height === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const result = await pool.query(
      `INSERT INTO segments (project_id, id, code, title, details, top, left, width, height, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, code, title, details, top, left, width, height, color`,
      [projectId, id, code, title || '', details || '', top, left, width, height, color || 'cyan']
    )

    res.status(201).json({
      message: 'Segment created successfully',
      segment: result.rows[0],
    })
  } catch (error) {
    console.error('Create segment error:', error)
    res.status(500).json({ error: 'Failed to create segment' })
  }
})

// Update segment
router.put('/:segmentId', authMiddleware, verifyProjectOwnership, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, segmentId } = req.params
    const { code, title, details, top, left, width, height, color } = req.body

    // Verify segment exists and belongs to project
    const checkResult = await pool.query(
      'SELECT id FROM segments WHERE id = $1 AND project_id = $2',
      [segmentId, projectId]
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Segment not found' })
    }

    const result = await pool.query(
      `UPDATE segments SET
        code = COALESCE($1, code),
        title = COALESCE($2, title),
        details = COALESCE($3, details),
        top = COALESCE($4, top),
        left = COALESCE($5, left),
        width = COALESCE($6, width),
        height = COALESCE($7, height),
        color = COALESCE($8, color),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING id, code, title, details, top, left, width, height, color`,
      [code || null, title || null, details || null, top ?? null, left ?? null, width ?? null, height ?? null, color || null, segmentId]
    )

    res.json({
      message: 'Segment updated successfully',
      segment: result.rows[0],
    })
  } catch (error) {
    console.error('Update segment error:', error)
    res.status(500).json({ error: 'Failed to update segment' })
  }
})

// Delete segment
router.delete('/:segmentId', authMiddleware, verifyProjectOwnership, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, segmentId } = req.params

    // Verify segment exists and belongs to project
    const checkResult = await pool.query(
      'SELECT id FROM segments WHERE id = $1 AND project_id = $2',
      [segmentId, projectId]
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Segment not found' })
    }

    await pool.query('DELETE FROM segments WHERE id = $1', [segmentId])

    res.json({
      message: 'Segment deleted successfully',
    })
  } catch (error) {
    console.error('Delete segment error:', error)
    res.status(500).json({ error: 'Failed to delete segment' })
  }
})

export default router
