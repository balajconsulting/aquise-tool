const express = require('express');
const router = express.Router();
const crawlerJobController = require('../controllers/crawlerJobController');

router.get('/jobs', crawlerJobController.getAllJobs);
router.get('/jobs/:id', crawlerJobController.getJobById);
router.post('/jobs', crawlerJobController.createJob);
router.patch('/jobs/:id/status', crawlerJobController.updateJobStatus);
router.patch('/jobs/:id/restart', crawlerJobController.restartJob);
router.delete('/jobs/:id', crawlerJobController.deleteJob);
router.get('/preview', crawlerJobController.previewGelbeSeitenTreffer);

module.exports = router; 