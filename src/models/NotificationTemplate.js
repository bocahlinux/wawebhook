import mongoose from 'mongoose';

const notificationTemplateSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    slug: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    groupId: {
        type: String,
        required: true,
        trim: true
    },
    template: {
        type: String,
        required: true
    },
    // auto-extracted from template, e.g. ["lokasi", "status", "pesan"]
    variables: {
        type: [String],
        default: []
    },
    enabled: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// slug unik per user
notificationTemplateSchema.index({ userId: 1, slug: 1 }, { unique: true });

const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);
export default NotificationTemplate;
