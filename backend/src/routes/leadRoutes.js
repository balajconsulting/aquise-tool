const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');

router.get('/next', leadController.getNextLead);
router.get('/stats', leadController.getStats);
router.get('/count/swipeable', leadController.getSwipeableCount);
router.get('/', leadController.getAllLeads);
router.get('/:id', leadController.getLeadById);
router.post('/', leadController.createLead);
router.put('/:id', leadController.updateLead);
router.patch('/:id', leadController.updateLead);
router.delete('/:id', leadController.deleteLead);
router.get('/stats/timeseries', leadController.getStatsTimeseries);

module.exports = router; 