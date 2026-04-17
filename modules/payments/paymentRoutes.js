import express from 'express';
import { 
    handleSuccess, 
    handleFailure, 
    handleIPN,
    processSuccessRedirect,
    processFailRedirect,
    processCancelRedirect
} from './paymentController.js';

const router = express.Router();


router.post('/success', handleSuccess);        
router.post('/fail', handleFailure);
router.post('/cancel', handleFailure); 
router.post('/ipn', handleIPN);


router.get('/process-success', processSuccessRedirect);
router.get('/process-fail', processFailRedirect);
router.get('/process-cancel', processCancelRedirect);


router.post('/process-success', processSuccessRedirect);  
router.post('/process-fail', processFailRedirect);        
router.post('/process-cancel', processCancelRedirect);    

export default router;