import mongoose from 'mongoose';
import auditLogSchema from '../schemas/auditLogSchema.js';

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
