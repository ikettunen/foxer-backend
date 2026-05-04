import { Router } from 'express'
import { TrackingController } from './tracking.controller'
import { authenticate } from '../../middleware/auth'
import { requireRole } from '../../middleware/role'
import { validate } from '../../middleware/validate'
import { z } from 'zod'

const router = Router()

const actionTypeEnum = z.enum([
  'lesson_opened', 'lesson_completed', 'quiz_started', 'quiz_completed',
  'day_completed', 'course_enrolled', 'course_completed',
  'checkin_site', 'checkout_site', 'app_opened', 'app_backgrounded',
])

const logActionSchema = z.object({
  action_type: actionTypeEnum,
  metadata:    z.record(z.unknown()).optional(),
  course_id:   z.string().optional(),
  day_number:  z.number().int().min(1).optional(),
})

const locationSchema = z.object({
  session_id:  z.number().int(),
  lat:         z.number().min(-90).max(90),
  lng:         z.number().min(-180).max(180),
  altitude:    z.number().optional(),
  accuracy:    z.number().optional(),
  speed:       z.number().optional(),
  heading:     z.number().optional(),
  recorded_at: z.string().datetime().optional(),
})

const startSessionSchema = z.object({
  session_type: z.enum(['flight', 'practice', 'ground']),
  site_name:    z.string().optional(),
})

const endSessionSchema = z.object({
  session_id: z.number().int(),
  notes:      z.string().optional(),
})

router.use(authenticate)

// Actions
router.post('/action',  validate(logActionSchema),    TrackingController.logAction)
router.get('/actions',  requireRole('admin'),          TrackingController.getActions)

// Location
router.post('/location',                validate(locationSchema),    TrackingController.postLocation)
router.get('/location/live',            requireRole('admin'),        TrackingController.getLive)
router.post('/location/session/start',  validate(startSessionSchema), TrackingController.startSession)
router.post('/location/session/end',    validate(endSessionSchema),   TrackingController.endSession)
router.get('/location/session/:sessionId', TrackingController.getSessionTrail)
router.get('/location/:userId',         requireRole('admin'),        TrackingController.getLatestLocation)

export default router
