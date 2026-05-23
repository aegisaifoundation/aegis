export default async function execute(input, context) {
    const args = input.trim().split(/\s+/).filter(Boolean);
    const services = context.services;
    const registry = services.getRegistry();
    const commandLoader = services.getCommandLoader();
    if (args.length === 0) {
        const commands = registry.list();
        if (commands.length === 0) {
            return {
                success: true,
                message: 'No commands registered to reload.'
            };
        }
        const errors = [];
        let successCount = 0;
        for (const cmd of commands) {
            const path = cmd.commandPath;
            if (!path) {
                errors.push(`Command '${cmd.name}' has no commandPath.`);
                continue;
            }
            try {
                const reloadedCmd = await commandLoader.loadCommand(path);
                registry.unregister(cmd.name);
                registry.register(reloadedCmd);
                successCount++;
            }
            catch (err) {
                errors.push(`Failed to reload '${cmd.name}': ${err.message}`);
            }
        }
        const errorMsg = errors.length > 0 ? `\nErrors:\n${errors.join('\n')}` : '';
        return {
            success: errors.length === 0,
            message: `Successfully reloaded ${successCount}/${commands.length} commands.${errorMsg}`
        };
    }
    const targetName = args[0];
    const existingCmd = registry.get(targetName);
    if (!existingCmd) {
        return {
            success: false,
            message: `Error: Command '${targetName}' is not registered.`
        };
    }
    const path = existingCmd.commandPath;
    if (!path) {
        return {
            success: false,
            message: `Error: Command '${targetName}' has no associated path and cannot be reloaded.`
        };
    }
    try {
        const reloadedCmd = await commandLoader.loadCommand(path);
        registry.unregister(targetName);
        registry.register(reloadedCmd);
        services.getEventBus().emit('command_reloaded', { name: reloadedCmd.name, path });
        return {
            success: true,
            message: `Successfully reloaded command: ${reloadedCmd.name}`
        };
    }
    catch (err) {
        return {
            success: false,
            message: `Failed to reload command '${targetName}': ${err.message}`
        };
    }
}
