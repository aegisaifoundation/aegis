export default async function execute(input, context) {
    try {
        context.services.getEventBus().emit('runtime_shutdown_requested');
        return {
            success: true,
            message: 'Shutdown requested successfully.'
        };
    }
    catch (err) {
        return {
            success: false,
            message: `Failed to request shutdown: ${err.message}`
        };
    }
}
