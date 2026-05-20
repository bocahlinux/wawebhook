import { Router } from 'express';
import { isAuthenticated, isAuthenticatedOrApiKey, getEffectiveUserId } from '../middleware/auth.js';
import NotificationTemplate from '../models/NotificationTemplate.js';
import NotificationLog from '../models/NotificationLog.js';

const router = Router();

// Ekstrak variabel dari template string, misal "{{lokasi}}" → ["lokasi"]
function extractVariables(template) {
    const matches = template.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
}

// Render template dengan mengisi variabel
function renderTemplate(template, variables) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

// ─── Web UI Routes ────────────────────────────────────────────────────────────

// Halaman notifikasi
router.get('/notifications', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const templates = await NotificationTemplate.find({ userId }).sort({ createdAt: -1 });
        res.render('notifications', {
            page: 'notifications',
            user: req.user,
            templates,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (error) {
        console.error('Notifications page error:', error);
        res.redirect('/dashboard');
    }
});

// Tambah template baru
router.post('/notifications/add', isAuthenticated, async (req, res) => {
    const { slug, name, groupId, template } = req.body;
    try {
        const userId = req.user.id;
        const variables = extractVariables(template);
        await NotificationTemplate.create({ userId, slug, name, groupId, template, variables });
        res.redirect('/notifications?success=Template+berhasil+ditambahkan');
    } catch (error) {
        const msg = error.code === 11000
            ? 'Slug sudah digunakan, gunakan slug lain'
            : error.message;
        res.redirect(`/notifications?error=${encodeURIComponent(msg)}`);
    }
});

// Edit template
router.post('/notifications/edit/:id', isAuthenticated, async (req, res) => {
    const { slug, name, groupId, template } = req.body;
    try {
        const variables = extractVariables(template);
        await NotificationTemplate.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { slug, name, groupId, template, variables }
        );
        res.redirect('/notifications?success=Template+berhasil+diperbarui');
    } catch (error) {
        const msg = error.code === 11000
            ? 'Slug sudah digunakan, gunakan slug lain'
            : error.message;
        res.redirect(`/notifications?error=${encodeURIComponent(msg)}`);
    }
});

// Toggle aktif/nonaktif
router.post('/notifications/toggle/:id', isAuthenticated, async (req, res) => {
    try {
        const tpl = await NotificationTemplate.findOne({ _id: req.params.id, userId: req.user.id });
        if (tpl) {
            tpl.enabled = !tpl.enabled;
            await tpl.save();
        }
        res.redirect('/notifications');
    } catch (error) {
        res.redirect(`/notifications?error=${encodeURIComponent(error.message)}`);
    }
});

// Hapus template
router.post('/notifications/delete/:id', isAuthenticated, async (req, res) => {
    try {
        await NotificationTemplate.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        res.redirect('/notifications?success=Template+berhasil+dihapus');
    } catch (error) {
        res.redirect(`/notifications?error=${encodeURIComponent(error.message)}`);
    }
});

// Log pengiriman per template
router.get('/notifications/:id/logs', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const template = await NotificationTemplate.findOne({ _id: req.params.id, userId });
        if (!template) return res.redirect('/notifications');

        const logs = await NotificationLog.find({ templateId: req.params.id, userId })
            .sort({ createdAt: -1 })
            .limit(100);

        res.render('notification-logs', {
            page: 'notifications',
            user: req.user,
            template,
            logs
        });
    } catch (error) {
        res.redirect('/notifications');
    }
});

// ─── API Routes ───────────────────────────────────────────────────────────────

// GET /api/notifications — list semua template milik user
router.get('/api/notifications', isAuthenticatedOrApiKey, async (req, res) => {
    try {
        const userId = getEffectiveUserId(req);
        const templates = await NotificationTemplate.find({ userId, enabled: true })
            .select('slug name groupId variables enabled createdAt')
            .sort({ createdAt: -1 });
        res.json({ success: true, total: templates.length, templates });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch templates', details: error.message });
    }
});

// POST /api/notify/:slug — kirim notifikasi
router.post('/api/notify/:slug', isAuthenticatedOrApiKey, async (req, res) => {
    try {
        const userId = getEffectiveUserId(req);
        const { slug } = req.params;
        const variables = req.body || {};

        const tpl = await NotificationTemplate.findOne({ userId, slug });

        if (!tpl) {
            return res.status(404).json({ error: 'Template tidak ditemukan', slug });
        }
        if (!tpl.enabled) {
            return res.status(403).json({ error: 'Template sedang dinonaktifkan', slug });
        }

        const renderedMessage = renderTemplate(tpl.template, variables);
        const groupJid = tpl.groupId.includes('@g.us') ? tpl.groupId : `${tpl.groupId}@g.us`;

        const whatsappService = req.app.get('whatsappService');
        await whatsappService.sendGroupMessage(userId, groupJid, renderedMessage);

        await NotificationLog.create({
            userId,
            templateId: tpl._id,
            templateSlug: tpl.slug,
            templateName: tpl.name,
            groupId: groupJid,
            variables,
            renderedMessage,
            status: 'sent'
        });

        res.json({
            success: true,
            slug,
            groupId: groupJid,
            message: renderedMessage
        });

    } catch (error) {
        console.error('Notify error:', error);

        // Coba simpan log gagal jika template sempat ditemukan
        try {
            const userId = getEffectiveUserId(req);
            const tpl = await NotificationTemplate.findOne({ userId, slug: req.params.slug });
            if (tpl) {
                await NotificationLog.create({
                    userId,
                    templateId: tpl._id,
                    templateSlug: tpl.slug,
                    templateName: tpl.name,
                    groupId: tpl.groupId,
                    variables: req.body || {},
                    renderedMessage: '',
                    status: 'failed',
                    error: error.message
                });
            }
        } catch (_) {}

        res.status(500).json({ error: 'Gagal mengirim notifikasi', details: error.message });
    }
});

export default router;
