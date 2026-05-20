import mongoose from 'mongoose';

const notificationLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NotificationTemplate',
        required: true
    },
    templateSlug: {
        type: String,
        required: true
    },
    templateName: {
        type: String,
        required: true
    },
    groupId: {
        type: String,
        required: true
    },
    variables: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    renderedMessage: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['sent', 'failed'],
        required: true
    },
    error: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);
export default NotificationLog;
