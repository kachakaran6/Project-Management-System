import mongoose from 'mongoose';
import subscriptionSchema from '../schemas/subscriptionSchema.js';

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
