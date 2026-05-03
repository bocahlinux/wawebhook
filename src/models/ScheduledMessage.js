import mongoose from 'mongoose';

const scheduledMessageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    to: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    messageType: {
        type: String,
        enum: ['text', 'interactive'],
        default: 'text'
    },
    interactiveData: {
        type: Object,
        default: null
    },
    scheduledAt: {
        type: Date,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'cancelled'],
        default: 'pending',
        index: true
    },
    sentAt: {
        type: Date,
        default: null
    },
    error: {
        type: String,
        default: null
    },
    messageId: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
scheduledMessageSchema.index({ userId: 1, status: 1, scheduledAt: 1 });

// Update timestamp on save
scheduledMessageSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

const ScheduledMessage = mongoose.model('ScheduledMessage', scheduledMessageSchema);

export default ScheduledMessage;
