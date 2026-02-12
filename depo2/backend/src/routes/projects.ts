import { Router, Response } from 'express'
import pool from '../db/connection.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get all projects for authenticated user
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId

    const result = await pool.query(
      'SELECT id, name, description, created_at, updated_at FROM projects WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    )

    res.json({ projects: result.rows })
  } catch (error) {
    console.error('Get projects error:', error)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// Create new project
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' })
    }

    const result = await pool.query(
      'INSERT INTO projects (user_id, name, description) VALUES ($1, $2, $3) RETURNING id, name, description, created_at',
      [userId, name, description || '']
    )

    const project = result.rows[0]

    res.status(201).json({
      message: 'Project created successfully',
      project,
    })
  } catch (error) {
    console.error('Create project error:', error)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

// Get project with all data
router.get('/:projectId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const { projectId } = req.params

    // Verify user owns the project
    const projectResult = await pool.query(
      'SELECT id, name, description, created_at, updated_at FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const project = projectResult.rows[0]

    // Get segments
    const segmentsResult = await pool.query(
      'SELECT id, code, title, details, top, left, width, height, color FROM segments WHERE project_id = $1 ORDER BY created_at',
      [projectId]
    )

    // Get polylines
    const polylinesResult = await pool.query(
      'SELECT id, label, description, color, stroke_width as "strokeWidth", dash_style as "dashStyle", points FROM polylines WHERE project_id = $1 ORDER BY created_at',
      [projectId]
    )

    // Get wheel polylines
    const wheelPolylinesResult = await pool.query(
      'SELECT id, label, description, color, stroke_width as "strokeWidth", dash_style as "dashStyle", points FROM wheel_polylines WHERE project_id = $1 ORDER BY created_at',
      [projectId]
    )

    res.json({
      project,
      segments: segmentsResult.rows,
      polylines: polylinesResult.rows,
      wheelPolylines: wheelPolylinesResult.rows,
    })
  } catch (error) {
    console.error('Get project error:', error)
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

// Update project
router.put('/:projectId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const { projectId } = req.params
    const { name, description } = req.body

    // Verify user owns the project
    const checkResult = await pool.query('SELECT user_id FROM projects WHERE id = $1', [projectId])

    if (checkResult.rows.length === 0 || checkResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const result = await pool.query(
      'UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, name, description',
      [name || null, description || null, projectId]
    )

    res.json({
      message: 'Project updated successfully',
      project: result.rows[0],
    })
  } catch (error) {
    console.error('Update project error:', error)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

// Delete project
router.delete('/:projectId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const { projectId } = req.params

    // Verify user owns the project
    const checkResult = await pool.query('SELECT user_id FROM projects WHERE id = $1', [projectId])

    if (checkResult.rows.length === 0 || checkResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [projectId])

    res.json({
      message: 'Project deleted successfully',
    })
  } catch (error) {
    console.error('Delete project error:', error)
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

export default router
